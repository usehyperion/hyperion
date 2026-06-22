import { invoke } from "@tauri-apps/api/core";
import * as cache from "tauri-plugin-cache-api";
import {
	channelBadgesQuery,
	cheermoteQuery,
	pollQuery,
	predictionQuery,
	streamQuery,
	toPubSubPoll,
	toPubSubPrediction,
} from "$lib/graphql/twitch";
import type { Cheermote } from "$lib/graphql/twitch";
import { ChannelEmoteManager } from "$lib/managers/channel-emote-manager";
import { fetch7tvId } from "$lib/seventv";
import { storage } from "$lib/stores";
import { app } from "../app.svelte";
import { ViewerManager } from "../managers/viewer-manager";
import { settings } from "../settings";
import type { StreamMarker } from "../twitch/api";
import type { TwitchClient } from "../twitch/client";
import { Badge } from "./badge";
import { Chat } from "./chat.svelte";
import { Poll } from "./poll.svelte";
import { Prediction } from "./prediction.svelte";
import { Stream } from "./stream.svelte";
import type { User } from "./user.svelte";
import { Viewer } from "./viewer.svelte";

export interface PollOptions {
	title: string;
	choices: string[];
	duration: number;
	channelPointsPerVote?: number;
}

export interface PredictionOptions {
	title: string;
	outcomes: string[];
	window: number;
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
	 * Whether the channel is pinned.
	 */
	public readonly pinned: boolean;

	/**
	 * The stream associated with the channel if it's currently live.
	 */
	public stream = $state<Stream | null>(null);

	/**
	 * The poll associated with the channel if one is currently active.
	 */
	public poll = $state<Poll | null>(null);

	/**
	 * The prediction associated with the channel if one is currently active.
	 */
	public prediction = $state<Prediction | null>(null);

	/**
	 * Whether the channel is joined.
	 */
	public joined = false;

	/**
	 * Whether the channel is ephemeral.
	 */
	public ephemeral = $state(false);

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

	/**
	 * Whether the current user moderates this channel.
	 */
	public get isMod() {
		return app.user?.moderates(this.id) ?? false;
	}

	public async join(split = false) {
		if (this.joined) return;

		app.channels.set(this.id, this);
		this.joined = true;

		if (!split) {
			app.focused = this;
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
			this.chat.fetchPinned(),
			this.fetchPoll(),
			this.fetchPrediction(),
		]);

		this.seventvId = seventvId;
		await this.stream?.fetchGuests();

		// Don't resolve to avoid blocking the UI
		void invoke("join", {
			id: this.id,
			stvId: this.seventvId,
			setId: this.emoteSetId,
			login: this.user.username,
			isMod: this.isMod,
		});

		if (settings.state["chat.messages.history.enabled"]) {
			await invoke("fetch_recent_messages", {
				channel: this.user.username,
				limit: settings.state["chat.messages.history.limit"],
			});
		} else {
			await this.chat.fetchPinned();
		}
	}

	public async leave() {
		if (!this.joined) return;

		try {
			await invoke("leave", { channel: this.user.username });
		} finally {
			this.reset();

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

	public clearPoll(poll = this.poll) {
		if (this.poll === poll) {
			this.poll?.dispose();
			this.poll = null;
		}
	}

	public clearPrediction(prediction = this.prediction) {
		if (this.prediction === prediction) {
			this.prediction?.dispose();
			this.prediction = null;
		}
	}

	public reset() {
		this.joined = false;

		this.clearPoll();
		this.clearPrediction();

		this.chat.reset();
		this.badges.clear();
		this.emotes.clear();
		this.viewers.clear();
	}

	/**
	 * Retrieves the list of badges in the channel and caches them for later use.
	 */
	public async fetchBadges(force = false) {
		if (!force && this.badges.size) {
			return this.badges;
		}

		let badges = await cache.get<Badge[]>(`badges:${this.id}`);

		if (force || !badges) {
			if (force) this.badges.clear();

			const { user } = await this.client.gql(channelBadgesQuery, { id: this.id });
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

			const { user } = await this.client.gql(cheermoteQuery, { id: this.id });

			cheermotes = user?.cheer?.emotes.filter((e) => e != null) ?? [];
			await cache.set(`cheermotes:${this.id}`, cheermotes);
		}

		this.cheermotes.push(...cheermotes);
		return this.cheermotes;
	}

	/**
	 * Retrieves the poll in the channel if there one is active.
	 */
	public async fetchPoll() {
		const { user } = await this.client.gql(pollQuery, { id: this.id });
		if (!user?.viewablePoll) return null;

		const creator = await this.client.users.fetch(user.viewablePoll.createdBy!.id);
		this.poll = new Poll(this, creator, toPubSubPoll(this.id, user.viewablePoll));

		return this.poll;
	}

	/**
	 * Retrieves the prediction in the channel if there one is active.
	 */
	public async fetchPrediction() {
		const { channel } = await this.client.gql(predictionQuery, { id: this.id });

		if (!channel?.activePredictionEvents?.length && !channel?.lockedPredictionEvents?.length) {
			return null;
		}

		const prediction =
			channel.activePredictionEvents?.[0] ?? channel.lockedPredictionEvents?.[0];
		if (!prediction?.createdBy) return null;

		const creator = await this.client.users.fetch(prediction.createdBy.id);
		this.prediction = new Prediction(this, creator, toPubSubPrediction(this.id, prediction));

		return this.prediction;
	}

	/**
	 * Retrieves the stream of the channel if it's live.
	 */
	public async fetchStream() {
		const { user } = await this.client.gql(streamQuery, { id: this.id });

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

	/**
	 * Creates a new poll in the channel.
	 */
	public async createPoll(options: PollOptions) {
		if (!this.isMod) return;

		await this.client.post("/polls", {
			body: {
				broadcaster_id: this.id,
				title: options.title,
				choices: options.choices.map((title) => ({ title })),
				duration: options.duration,
				...(options.channelPointsPerVote && {
					channel_points_voting_enabled: true,
					channel_points_per_vote: options.channelPointsPerVote,
				}),
			},
		});
	}

	/**
	 * Creates a new prediction in the channel.
	 */
	public async createPrediction(options: PredictionOptions) {
		if (!this.isMod) return;

		await this.client.post("/predictions", {
			body: {
				broadcaster_id: this.id,
				title: options.title,
				outcomes: options.outcomes.map((title) => ({ title })),
				prediction_window: options.window,
			},
		});
	}

	public async blockTerm(term: string) {
		if (!app.user || !this.isMod) return;

		await this.client.post("/moderation/blocked_terms", {
			params: {
				broadcaster_id: this.id,
				moderator_id: app.user.id,
			},
			body: {
				text: term,
			},
		});
	}

	public async raid(to: string) {
		if (!this.isMod) return;

		await this.client.post("/raids", {
			params: {
				from_broadcaster_id: this.id,
				to_broadcaster_id: to,
			},
		});
	}

	public async unraid() {
		if (!this.isMod) return;

		await this.client.delete("/raids", { broadcaster_id: this.id });
	}

	public async shoutout(to: string) {
		if (!app.user || !this.isMod) return;

		await this.client.post("/chat/shoutouts", {
			params: {
				from_broadcaster_id: this.id,
				to_broadcaster_id: to,
				moderator_id: app.user.id,
			},
		});
	}
}
