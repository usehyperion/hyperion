import { invoke, Channel as IpcChannel } from "@tauri-apps/api/core";
import { SvelteMap } from "svelte/reactivity";
import { handlers } from "./handlers";
import { History } from "./history.svelte";
import { log } from "./log";
import { ChannelManager } from "./managers/channel-manager";
import { EmoteManager } from "./managers/emote-manager";
import { SplitLayout } from "./split-layout";
import { TwitchClient } from "./twitch/client";
import type { EmoteSet } from "./emotes";
import type { Badge } from "./graphql/twitch";
import type { Channel } from "./models/channel.svelte";
import type { CurrentUser } from "./models/current-user.svelte";
import type { DispatchPayload, Paint } from "./seventv";
import type { Theme } from "./themes";
import type { NotificationPayload } from "./twitch/eventsub";
import type { IrcMessage } from "./twitch/irc";

class App {
	public readonly twitch = new TwitchClient();

	/**
	 * Whether the app has made all necessary connections.
	 */
	public connected = $state(false);

	/**
	 * The currently authenticated user.
	 */
	public user = $state<CurrentUser | null>(null);

	/**
	 * The currently focused channel in {@linkcode channels}.
	 */
	public focused = $state<Channel | null>(null);

	public readonly themes = new SvelteMap<string, Theme>();

	/**
	 * The channels the app is able to join.
	 */
	public readonly channels = new ChannelManager(this.twitch);

	/**
	 * The current split layout.
	 */
	public readonly splits = new SplitLayout();

	/**
	 * Route history.
	 */
	public readonly history = new History();

	/**
	 * Provider-specific global emotes.
	 */
	public readonly emotes = new EmoteManager();

	/**
	 * Provider-specific emote sets.
	 */
	public readonly emoteSets = new SvelteMap<string, EmoteSet>();

	/**
	 * Provider-specific global badges.
	 */
	public readonly badges = new Map<string, Badge>();

	/**
	 * 7TV paints.
	 */
	public readonly paints = new Map<string, Paint>();

	// Associates a (u)ser id to a 7TV (b)adge or (p)aint.
	public readonly u2b = new SvelteMap<string, Badge | undefined>();
	public readonly u2p = new SvelteMap<string, Paint | undefined>();

	public async connect() {
		if (!this.user || this.connected) return;

		const ircChannel = new IpcChannel<IrcMessage>(async (message) => {
			await this.#handle(message.type, message);
		});

		const eventsubChannel = new IpcChannel<NotificationPayload>(async (message) => {
			await this.#handle(message.subscription.type, message.event);
		});

		const seventvChannel = new IpcChannel<DispatchPayload>(async (message) => {
			await this.#handle(
				message.type,
				"object" in message.body ? message.body.object : message.body,
			);
		});

		await Promise.all([
			invoke("connect_irc", { channel: ircChannel }),
			invoke("connect_eventsub", { channel: eventsubChannel }),
			invoke("connect_seventv", { channel: seventvChannel }),
		]);

		this.connected = true;
		log.info("All connections established");
	}

	async #handle(key: string, payload: any) {
		await handlers.get(key)?.handle(payload);
	}
}

export const app = new App();
