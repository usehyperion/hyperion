import { invoke } from "@tauri-apps/api/core";

import type { PredictionOutcome } from "#lib/graphql/twitch.js";
import type { TwitchClient } from "#lib/twitch/client.js";
import type { IrcMessage } from "#lib/twitch/irc.js";

import { app } from "#lib/app.svelte.js";
import {
	pollQuery,
	predictionQuery,
	streamQuery,
	toPubSubPoll,
	toPubSubPrediction,
	cancelRaidMutation,
	startRaidMutation,
	startPollMutation,
	startPredictionMutation,
	blockTermMutation,
	shoutoutMutation,
	createMarkerMutation,
} from "#lib/graphql/twitch.js";
import { handlers } from "#lib/handlers/index.js";
import { log } from "#lib/log.js";
import { ChannelBadgeManager } from "#lib/managers/channel-badge-manager.js";
import { ChannelEmoteManager } from "#lib/managers/channel-emote-manager.js";
import { CheermoteManager } from "#lib/managers/cheermote-manager.js";
import { ViewerManager } from "#lib/managers/viewer-manager.js";
import { settings } from "#lib/settings/index.js";
import { storage } from "#lib/stores.js";

import type { User } from "./user.svelte";

import { Chat } from "./chat.svelte";
import { Poll } from "./poll.svelte";
import { Prediction } from "./prediction.svelte";
import { Stream } from "./stream.svelte";
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

const TTL = 20 * 60 * 1000; // 20 minutes

/**
 * Where a channel is in its join lifecycle.
 *
 * - `idle`: not joined; channel data may be cached until the TTL expires.
 * - `joining`: channel data is being fetched; IRC has not been joined yet.
 * - `joined`: IRC has been joined and channel data is loaded.
 * - `leaving`: IRC is being left.
 */
export type ChannelStatus = "idle" | "joining" | "joined" | "leaving";

export class Channel {
	#ttlTimeout: ReturnType<typeof setTimeout> | undefined;

	#status = $state<ChannelStatus>("idle");

	// Identifies the join attempt that is allowed to complete.
	#attempt: object | null = null;

	#joining: Promise<void> | null = null;
	#leaving: Promise<void> | null = null;

	public readonly id: string;

	public seventvId: string | null = null;

	/**
	 * The chat associated with the channel.
	 */
	public readonly chat: Chat;

	/**
	 * The badges in the channel.
	 */
	public readonly badges: ChannelBadgeManager;

	/**
	 * The emotes in the channel.
	 */
	public readonly emotes: ChannelEmoteManager;

	/**
	 * The cheermotes in the channel.
	 */
	public readonly cheermotes: CheermoteManager;

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
		this.badges = new ChannelBadgeManager(this);
		this.emotes = new ChannelEmoteManager(this);
		this.cheermotes = new CheermoteManager(this);
		this.viewers = new ViewerManager(this);

		this.pinned = $derived(storage.state.pinned.includes(this.id));
	}

	/**
	 * Whether the current user moderates this channel.
	 */
	public get isMod() {
		return app.user?.moderates(this.id) ?? false;
	}

	/**
	 * Where the channel is in its join lifecycle.
	 */
	public get status() {
		return this.#status;
	}

	/**
	 * Whether the channel is fully joined.
	 */
	public get joined() {
		return this.#status === "joined";
	}

	public join() {
		if (this.#status === "joined") {
			return Promise.resolve();
		}

		if (!this.#joining) {
			const joining = this.#join().finally(() => {
				if (this.#joining === joining) this.#joining = null;
			});

			this.#joining = joining;
		}

		return this.#joining;
	}

	public leave() {
		this.#attempt = null;
		this.#joining = null;

		if (this.#status === "joined") {
			return (this.#leaving = this.#leave());
		}

		if (this.#status === "joining") {
			// IRC isn't joined until the attempt completes, so there's nothing
			// to leave on the backend.
			this.#teardown();
		}

		return this.#leaving ?? Promise.resolve();
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

	/**
	 * Retrieves the poll in the channel if there one is active.
	 */
	public async fetchPoll() {
		const { user } = await this.client.gql(pollQuery, { id: this.id });
		if (!user?.viewablePoll) return null;

		const creator = this.client.users.from(user.viewablePoll.createdBy!);
		this.poll = new Poll(this, creator, toPubSubPoll(this.id, user.viewablePoll));

		return this.poll;
	}

	/**
	 * Retrieves the prediction in the channel if there one is active.
	 */
	public async fetchPrediction() {
		const { channel } = await this.client.gql(predictionQuery, { id: this.id });
		if (!channel) return null;

		const { active, locked } = channel;
		if (!active?.length && !locked?.length) return null;

		const prediction = active?.[0] ?? locked?.[0];
		if (!prediction?.createdBy) return null;

		const creator =
			prediction.createdBy.__typename === "User"
				? this.client.users.from(prediction.createdBy)
				: null;

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
			this.stream.setGuests(user.channel);
		}

		return this.stream;
	}

	public async createMarker(description?: string) {
		const { createVideoBookmark } = await this.client.gql(createMarkerMutation, {
			input: {
				channelID: this.id,
				description,
				medium: "chat",
				platform: "web",
			},
		});

		return createVideoBookmark?.videoBookmark ?? null;
	}

	/**
	 * Starts a new poll in the channel.
	 */
	public async startPoll(options: PollOptions) {
		if (!this.isMod) return;

		await this.client.gql(startPollMutation, {
			input: {
				ownedBy: this.id,
				title: options.title,
				choices: options.choices.map((title) => ({ title })),
				durationSeconds: options.duration,
				...(options.channelPointsPerVote && {
					channelPointsVotingEnabled: true,
					channelPointsPerVote: options.channelPointsPerVote,
				}),
			},
		});
	}

	/**
	 * Starts a new prediction in the channel.
	 */
	public async startPrediction(options: PredictionOptions) {
		if (!this.isMod) return;

		let outcomes: PredictionOutcome[] = [];

		if (options.outcomes.length === 2) {
			// GraphQL requires the two outcomes have the correct colors
			outcomes = [
				{ title: options.outcomes[0], color: "BLUE" },
				{ title: options.outcomes[1], color: "PINK" },
			];
		} else {
			outcomes = options.outcomes.map((title) => ({ title, color: "BLUE" }));
		}

		await this.client.gql(startPredictionMutation, {
			input: {
				channelID: this.id,
				title: options.title,
				outcomes,
				predictionWindowSeconds: options.window,
			},
		});
	}

	public async blockTerm(term: string) {
		if (!app.user || !this.isMod) return;

		await this.client.gql(blockTermMutation, {
			channel: this.id,
			term,
		});
	}

	public async startRaid(to: string) {
		if (!this.isMod) return;

		await this.client.gql(startRaidMutation, {
			source: this.id,
			target: to,
		});
	}

	public async cancelRaid() {
		if (!this.isMod) return;

		await this.client.gql(cancelRaidMutation, { channel: this.id });
	}

	public async shoutout(to: string) {
		if (!app.user || !this.isMod) return;

		await this.client.gql(shoutoutMutation, {
			source: this.user.username,
			caller: app.user.username,
			target: to,
		});
	}

	async #join() {
		const attempt = {};
		this.#attempt = attempt;

		await this.#leaving?.catch(() => {});
		if (this.#attempt !== attempt) return;

		clearTimeout(this.#ttlTimeout);
		this.#status = "joining";

		app.channels.set(this.id, this);
		app.focused = this;

		if (!this.viewers.has(this.id)) {
			const viewer = new Viewer(this, this.user);
			viewer.broadcaster = true;

			this.viewers.set(this.id, viewer);
		}

		const results = await Promise.allSettled([
			this.fetchStream(),
			this.emotes.fetch(),
			this.badges.fetch(),
			this.cheermotes.fetch(),
			this.chat.fetchPinned(),
			this.fetchPoll(),
			this.fetchPrediction(),
		]);

		if (this.#attempt !== attempt) {
			// Left while joining. Drop anything the requests attached unless
			// a newer attempt has taken over.
			if (this.status === "idle") {
				this.#clearLive();
			}

			return;
		}

		this.#attempt = null;

		const failure = results.find((result) => result.status === "rejected");

		if (failure) {
			this.#teardown();
			throw failure.reason;
		}

		this.#status = "joined";

		// Don't resolve to avoid blocking the UI
		void invoke("join", {
			id: this.id,
			stvId: this.seventvId,
			setId: this.emoteSetId,
			login: this.user.username,
			isMod: this.isMod,
		});

		if (settings.state["chat.messages.history.enabled"]) {
			void this.#loadRecentMessages();
		}
	}

	async #leave() {
		this.#status = "leaving";

		try {
			await invoke("leave", { channel: this.user.username });
		} finally {
			this.#leaving = null;
			this.#teardown();
		}
	}

	#teardown() {
		this.#status = "idle";

		this.#clearLive();
		this.chat.reset();
		this.viewers.clear();

		app.user?.banned.delete(this.id);

		clearTimeout(this.#ttlTimeout);

		this.#ttlTimeout = setTimeout(() => {
			this.badges.clear();
			this.emotes.clear();
			this.cheermotes.clear();
		}, TTL);
	}

	#clearLive() {
		this.clearPoll();
		this.clearPrediction();
		this.chat.clearPin();
	}

	async #loadRecentMessages() {
		try {
			const messages = await invoke<IrcMessage[]>("fetch_recent_messages", {
				channel: this.user.username,
				limit: settings.state["chat.messages.history.limit"],
			});

			for (const message of messages) {
				// Needs to be sequential
				// oxlint-disable-next-line no-await-in-loop
				await handlers.get(message.type)?.handle(message);
			}
		} catch (error) {
			log.error(`Failed to load recent messages for ${this.user.username}: ${String(error)}`);
		}
	}
}
