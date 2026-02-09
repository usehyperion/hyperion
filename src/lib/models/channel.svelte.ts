import { invoke } from "@tauri-apps/api/core";
import * as cache from "tauri-plugin-cache-api";
import { channelBadgesQuery, cheermoteQuery, streamQuery } from "$lib/graphql/twitch";
import type { Cheermote } from "$lib/graphql/twitch";
import { fetch7tvId } from "$lib/seventv";
import { storage } from "$lib/stores";
import type { PollChoice } from "$lib/twitch/eventsub";
import { app } from "../app.svelte";
import { ChannelEmoteManager } from "../managers/channel-emote-manager";
import { ViewerManager } from "../managers/viewer-manager";
import { settings } from "../settings";
import type { StreamMarker } from "../twitch/api";
import type { TwitchClient } from "../twitch/client";
import { Badge } from "./badge";
import { Chat } from "./chat.svelte";
import { Stream } from "./stream.svelte";
import { Viewer } from "./viewer.svelte";
import type { User } from "./user.svelte";

export interface Poll {
	title: string;
	choices: PollChoice[];
}

export class Channel {
	public readonly id: string;

	public seventvId: string | null = null;

	/**
	 * The chat associated with the channel.
	 */
	public readonly chat: Chat;

	/**
	 * The badges in the channel.
	 */
	public readonly badges = new Map<string, Badge>();

	/**
	 * The emotes in the channel.
	 */
	public readonly emotes: ChannelEmoteManager;

	/**
	 * The cheermotes in the channel.
	 */
	public readonly cheermotes = $state<Cheermote[]>([]);

	/**
	 * The viewers in the channel.
	 */
	public readonly viewers: ViewerManager;

	/**
	 * The stream associated with the channel if it's currently live.
	 */
	public stream = $state<Stream | null>(null);

	/**
	 * The active poll in the channel if any.
	 */
	public poll = $state<Poll | null>(null);

	/**
	 * Whether the channel is joined.
	 */
	public joined = false;

	/**
	 * Whether the channel is ephemeral.
	 */
	public ephemeral = $state(false);

	/**
	 * Whether the channel is pinned.
	 */
	public readonly pinned: boolean;

	/**
	 * The id of the active 7TV emote set for the channel if any.
	 */
	public emoteSetId = $state<string | null>(null);

	public constructor(
		public readonly client: TwitchClient,

		/**
		 * The user for the channel.
		 */
		public readonly user: User,
		stream: Stream | null = null,
	) {
		this.id = user.id;
		this.stream = stream;

		this.chat = new Chat(this);
		this.emotes = new ChannelEmoteManager(this);
		this.viewers = new ViewerManager(this);

		this.pinned = $derived(storage.state.pinned.includes(this.id));
	}

	public async join(split = false) {
		if (this.joined) return;

		app.channels.set(this.id, this);
		this.joined = true;

		if (!split) {
			app.focused = this;
			storage.state.lastJoined = this.ephemeral ? null : this.user.username;
		}

		if (!this.viewers.has(this.id)) {
			const viewer = new Viewer(this, this.user);
			viewer.broadcaster = true;

			this.viewers.set(this.id, viewer);
		}

		const [seventvId] = await Promise.all([
			fetch7tvId(this.id),
			this.fetchStream(),
			this.emotes.fetch(),
			this.fetchBadges(),
			this.fetchCheermotes(),
		]);

		this.seventvId = seventvId;
		await this.stream?.fetchGuests();

		// Don't resolve to avoid blocking the UI
		void invoke("join", {
			id: this.id,
			stvId: this.seventvId,
			setId: this.emoteSetId,
			login: this.user.username,
			isMod: app.user?.moderating.has(this.id),
		});

		if (settings.state["chat.messages.history.enabled"]) {
			await invoke("fetch_recent_messages", {
				channel: this.user.username,
				limit: settings.state["chat.messages.history.limit"],
			});
		}
	}

	public async leave() {
		if (!this.joined) return;

		try {
			await invoke("leave", { channel: this.user.username });
		} finally {
			this.reset();
			storage.state.lastJoined = null;

			if (app.user) {
				app.user.banned.delete(this.id);
			}
		}
	}

	public async rejoin() {
		await invoke("rejoin", { channel: this.user.username });

		if (app.user) {
			app.user.banned.delete(this.id);
		}
	}

	public reset() {
		this.joined = false;
		this.chat.reset();
		this.badges.clear();
		this.emotes.clear();
		this.viewers.clear();
	}

	/**
	 * Retrieves the list of badges in the channel and caches them for later use.
	 */
	public async fetchBadges(force = false) {
		if (!force && this.badges.size) return;

		let badges = await cache.get<Badge[]>(`badges:${this.id}`);

		if (force || !badges) {
			if (force) this.badges.clear();

			const { user } = await this.client.send(channelBadgesQuery, { id: this.id });
			badges = user?.broadcastBadges?.flatMap((b) => (b ? [Badge.fromGql(b)] : [])) ?? [];

			await cache.set(`badges:${this.id}`, badges);
		}

		for (const badge of badges) {
			this.badges.set(badge.id, badge);
		}

		return this.badges;
	}

	/**
	 * Retrieves the list of cheermotes in the channel and caches them for later
	 * use.
	 */
	public async fetchCheermotes(force = false) {
		let cheermotes = await cache.get<Cheermote[]>(`cheermotes:${this.id}`);

		if (force || !cheermotes) {
			if (force) this.cheermotes.length = 0;

			const { user } = await this.client.send(cheermoteQuery, { id: this.id });

			cheermotes = user?.cheer?.emotes.filter((e) => e != null) ?? [];
			await cache.set(`cheermotes:${this.id}`, cheermotes);
		}

		this.cheermotes.push(...cheermotes);
		return this.cheermotes;
	}

	/**
	 * Retrieves the stream of the channel if it's live.
	 */
	public async fetchStream() {
		const { user } = await this.client.send(streamQuery, { id: this.id });

		if (user?.stream) {
			this.stream = new Stream(this.client, this.id, user.stream);
		}

		return this.stream;
	}

	public async createMarker(description?: string) {
		const { data } = await this.client.post<StreamMarker>("/streams/markers", {
			body: {
				user_id: this.id,
				description,
			},
		});

		return data;
	}

	public async raid(to: string) {
		if (!app.user?.moderating.has(this.id)) {
			return;
		}

		await this.client.post("/raids", {
			params: {
				from_broadcaster_id: this.id,
				to_broadcaster_id: to,
			},
		});
	}

	public async unraid() {
		if (!app.user?.moderating.has(this.id)) {
			return;
		}

		await this.client.delete("/raids", { broadcaster_id: this.id });
	}

	public async shoutout(to: string) {
		if (!app.user?.moderating.has(this.id)) {
			return;
		}

		await this.client.post("/chat/shoutouts", {
			params: {
				from_broadcaster_id: this.id,
				to_broadcaster_id: to,
				moderator_id: app.user.id,
			},
		});
	}
}
