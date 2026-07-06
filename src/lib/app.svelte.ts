import { invoke, Channel as IpcChannel } from "@tauri-apps/api/core";
import { SvelteMap } from "svelte/reactivity";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import type { EmoteSet } from "./emotes";
import type { Badge } from "./graphql/twitch";
import { handlers } from "./handlers";
import { History } from "./history.svelte";
import { log } from "./log";
import { BadgeManager } from "./managers/badge-manager";
import { ChannelManager } from "./managers/channel-manager";
import { EmoteManager } from "./managers/emote-manager";
import type { Channel } from "./models/channel.svelte";
import type { CurrentUser } from "./models/current-user.svelte";
import type { DispatchPayload, Paint } from "./seventv";
import { SplitController } from "./splits/controller.svelte";
import type { Theme } from "./themes";
import { TwitchClient } from "./twitch/client";
import type { NotificationPayload } from "./twitch/eventsub";
import type { IrcMessage } from "./twitch/irc";
import type { PubSubTopic } from "./twitch/pubsub";

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
	public readonly splits = new SplitController();

	/**
	 * Route history.
	 */
	public readonly history = new History();

	/**
	 * Provider-specific global emotes.
	 */
	public readonly emotes = new EmoteManager();

	/**
	 * Provider-specific emote sets. Only used transitively between the timing
	 * of emote set events to associate emotes to users.
	 */
	public readonly emoteSets = new SvelteMap<string, EmoteSet>();

	/**
	 * Provider-specific global badges.
	 */
	public readonly badges = new BadgeManager();

	/**
	 * 7TV paints.
	 */
	public readonly paints = new Map<string, Paint>();

	// Associates a (u)ser id to a 7TV (b)adge or (p)aint.
	public readonly u2b = new SvelteMap<string, Badge | undefined>();
	public readonly u2p = new SvelteMap<string, Paint | undefined>();

	/**
	 * Switches the focused channel, joining it if necessary, and ensures it is
	 * present in the split layout (replacing the focused pane when not already
	 * shown).
	 */
	public async open(channel: Channel) {
		if (this.focused !== channel) {
			if (channel.joined) {
				this.focused = channel;
			} else {
				await channel.join();
			}
		}

		this.splits.ensure(channel.id);

		// The split view only lives at the root route, so return to it when
		// opening a channel from elsewhere.
		if (page.url.pathname !== "/") {
			await goto("/");
		}
	}

	public async connect() {
		if (!this.user || this.connected) return;

		const ircChannel = new IpcChannel<IrcMessage>(async (message) => {
			await this.#handle(message.type, message);
		});

		const eventsubChannel = new IpcChannel<NotificationPayload>(async (message) => {
			await this.#handle(message.subscription.type, message.event);
		});

		const pubsubChannel = new IpcChannel<PubSubTopic>(async (message) => {
			const [topic, id] = message.topic.split(".");

			await this.#handle(topic, { ...message.message, target_id: id });
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
			invoke("connect_pubsub", { channel: pubsubChannel }),
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
