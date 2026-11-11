import { invoke, Channel as IpcChannel } from "@tauri-apps/api/core";
import { tick } from "svelte";

import { goto } from "$app/navigation";
import { page } from "$app/state";

import type { Channel } from "./models/channel.svelte";
import type { NotificationOptions, NotificationResponse } from "./notifications";
import type { DispatchPayload } from "./seventv";
import type { IrcMessage } from "./twitch/irc";
import type { PubSubMessage } from "./twitch/pubsub";

import { dispatch } from "./handlers";
import { log } from "./log";
import { BadgeManager } from "./managers/badge-manager";
import { ChannelManager } from "./managers/channel-manager";
import { EmoteManager } from "./managers/emote-manager";
import { CurrentUser } from "./models/current-user.svelte";
import { settings } from "./settings";
import { SevenTvCosmetics } from "./seventv";
import { SplitController } from "./splits/controller.svelte";
import { firstLeaf } from "./splits/tree";
import { storage } from "./stores";
import { TwitchClient } from "./twitch/client";

/**
 * The account the backend signed in with after the user logged in on Twitch.
 */
export interface Account {
	id: string;
	login: string;
	accessToken: string;
}

const CONNECT_RETRY_MIN = 1000;
const CONNECT_RETRY_MAX = 60 * 1000;

/**
 * Persists the storage right away.
 */
async function saveStorage() {
	// Let the store see the latest state before saving.
	await tick();
	await storage.saveNow();
}

class App {
	public readonly twitch = new TwitchClient(() => {
		this.expireSession().catch(log.swallow("Failed to end the revoked session"));
	});

	public readonly channels = new ChannelManager(this.twitch);
	public readonly splits = new SplitController();

	/**
	 * Provider-specific global emotes.
	 */
	public readonly emotes = new EmoteManager();
	public readonly cosmetics = new SevenTvCosmetics();

	/**
	 * Provider-specific global badges.
	 */
	public readonly badges = new BadgeManager(this.twitch);

	public user = $state<CurrentUser | null>(null);

	#ending: Promise<void> | null = null;
	#connected = false;
	#connecting: Promise<void> | null = null;
	#ready = Promise.withResolvers<void>();

	/**
	 * Resolves once the backend connections are established.
	 */
	public get ready() {
		return this.#ready.promise;
	}

	/**
	 * The channel shown in the focused pane.
	 */
	public get focused() {
		const id = this.splits.focused?.active;
		return id ? (this.channels.get(id) ?? null) : null;
	}

	/**
	 * Shows a system notification. Resolves with the user's response, or
	 * `null` if the notification couldn't be shown.
	 *
	 * It only resolves once the user responds, which may be never, so don't
	 * await it where that would hold up other work.
	 */
	public async notify(options: NotificationOptions) {
		try {
			return await invoke<NotificationResponse>("notify", { options });
		} catch (error) {
			log.warn("Failed to show notification", error);
			return null;
		}
	}

	/**
	 * Restores the session stored by the backend. Resolves to the signed in
	 * user or `null` if they have to sign in again.
	 */
	public async restoreSession() {
		if (this.user) return this.user;

		const credentials = await invoke<{ accessToken: string } | null>("get_auth");

		if (!credentials) {
			storage.state.user = null;
			return null;
		}

		if (!storage.state.user) return null;

		this.twitch.token = credentials.accessToken;
		this.user = new CurrentUser(this.twitch.users.from(storage.state.user));

		return this.user;
	}

	public async completeLogin(account: Account) {
		this.twitch.token = account.accessToken;

		const user = await this.twitch.users.fetch(account.id);
		this.user = new CurrentUser(user);
		storage.state.user = user.data;

		log.info(`Logged in as ${account.login}`);

		await saveStorage();
		await goto("/", { refreshAll: true });
	}

	public async logOut() {
		await this.#endSession();
		log.info("User logged out");
	}

	public async expireSession() {
		log.warn("Twitch credentials were revoked, returning to login");
		await this.#endSession();
	}

	/**
	 * Loads what the signed in user needs. Each load runs once and is retried
	 * on the next call if it failed.
	 */
	public async load(user: CurrentUser) {
		// Without it no channel counts as moderated until the next load.
		await user.loadModerating().catch(log.swallow("Failed to load moderated channels"));

		if (!this.channels.has(user.id)) {
			this.channels.add(user);
		}

		user.loadFollowing().then((follows) => {
			for (const followed of follows) {
				if (!this.channels.has(followed.user.id)) {
					this.channels.add(followed.user, followed.stream);
				}
			}
		}, log.swallow("Failed to load followed channels"));

		user.loadWhispers().catch(log.swallow("Failed to load whispers"));

		await Promise.all([this.emotes.fetch(), this.badges.fetch()]);
	}

	/**
	 * Joins the channel and shows it in the focused pane unless it's already
	 * part of the layout.
	 */
	public async open(channel: Channel) {
		// Start joining before updating the layout so the tab shows the
		// joining state right away.
		const joining = channel.join();

		this.splits.ensure(channel);

		await Promise.all([
			joining,
			// The split view only lives at the root route, so return to it when
			// opening a channel from elsewhere.
			page.url.pathname === "/" ? null : goto("/"),
		]);
	}

	/**
	 * Opens a channel by login, adding it as ephemeral if it isn't known yet.
	 */
	public async openByLogin(login: string) {
		let channel = this.channels.getByLogin(login);

		if (!channel) {
			const user = await this.twitch.users.fetch(login, { by: "login" });

			channel = this.channels.add(user);
			channel.ephemeral = true;
		}

		await this.open(channel);

		return channel;
	}

	/**
	 * Shows the tab, joining its channel if it's known.
	 */
	public async activate(id: string) {
		const channel = this.channels.get(id);

		if (channel) {
			await this.open(channel);
		} else {
			this.splits.activate(id);
		}
	}

	/**
	 * Focuses the first pane and joins its active channel.
	 */
	public async restoreLayout() {
		// Only on launch; afterwards the layout is already live.
		if (!this.splits.root || this.splits.focusedPaneId) return;

		const pane = firstLeaf(this.splits.root);
		this.splits.focusedPaneId = pane.id;

		if (pane.active) await this.activate(pane.active);
	}

	public async closeTab(id: string) {
		this.splits.closeTab(id);
		await this.#leaveClosed([id]);
	}

	public async closePane(paneId: string) {
		const ids = this.splits.pane(paneId)?.tabs.map((tab) => tab.id) ?? [];

		this.splits.closePane(paneId);
		await this.#leaveClosed(ids);
	}

	/**
	 * Leaves the channel and removes it from the layout.
	 */
	public async leave(channel: Channel) {
		this.splits.closeTab(channel.id);
		await channel.leave();
	}

	/**
	 * Leaves an ephemeral channel and forgets it.
	 */
	public async remove(channel: Channel) {
		await this.leave(channel);
		this.channels.delete(channel.id);
	}

	public connect() {
		return (this.#connecting ??= this.#connectUntilReady().finally(() => {
			this.#connecting = null;
		}));
	}

	async #connectUntilReady() {
		for (let delay = CONNECT_RETRY_MIN; this.user && !this.#connected;) {
			try {
				// Attempts are sequential by design.
				// oxlint-disable-next-line no-await-in-loop
				await this.#connect();
			} catch (error) {
				log.warn(`Failed to connect, retrying in ${delay / 1000}s`, error);

				// oxlint-disable-next-line no-await-in-loop
				await new Promise((resolve) => setTimeout(resolve, delay));
				delay = Math.min(delay * 2, CONNECT_RETRY_MAX);
			}
		}
	}

	async #connect() {
		const irc = new IpcChannel<IrcMessage>(async (message) => {
			await dispatch("irc", message.type, message);
		});

		const pubsub = new IpcChannel<PubSubMessage>(async (message) => {
			await dispatch("pubsub", message.topic, {
				...message.message,
				target_id: message.target_id,
			});
		});

		const seventv = new IpcChannel<DispatchPayload>(async (message) => {
			await dispatch(
				"seventv",
				message.type,
				"object" in message.body ? message.body.object : message.body,
			);
		});

		await Promise.all([
			invoke("connect_irc", { channel: irc }),
			invoke("connect_pubsub", { channel: pubsub }),
			invoke("connect_seventv", { channel: seventv }),
		]);

		this.#connected = true;
		this.#ready.resolve();

		log.info("All connections established");
	}

	#reset() {
		this.#connected = false;
		this.#ready = Promise.withResolvers();
		this.user = null;
		this.twitch.token = null;

		this.channels.clear();
		this.emotes.clear();
		this.cosmetics.clear();
		this.badges.clear();
	}

	#endSession() {
		return (this.#ending ??= this.#teardown().finally(() => {
			this.#ending = null;
		}));
	}

	async #teardown() {
		this.twitch.token = null;

		await Promise.allSettled(this.channels.values().map((channel) => channel.leave()));

		this.#reset();
		storage.state.user = null;

		await saveStorage();

		try {
			// Drop the backend credentials and keyring entry too, otherwise the
			// next load restores the session and logs back in.
			await invoke("clear_session");
		} finally {
			await goto("/auth/login");
		}
	}

	async #leaveClosed(ids: string[]) {
		if (!settings.state["splits.leaveOnClose"]) return;

		await Promise.all(
			ids.flatMap((id) => {
				const channel = this.channels.get(id);
				return channel ? [channel.leave()] : [];
			}),
		);
	}
}

export const app = new App();
