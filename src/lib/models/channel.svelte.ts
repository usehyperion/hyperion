import { invoke } from "@tauri-apps/api/core";

import type { PredictionOutcome } from "#lib/graphql/twitch.js";
import type { TwitchClient } from "#lib/twitch/client.js";
import type { IrcMessage } from "#lib/twitch/irc.js";

import { app } from "#lib/app.svelte.js";
import {
	streamQuery,
	cancelRaidMutation,
	startRaidMutation,
	startPollMutation,
	startPredictionMutation,
	blockTermMutation,
	shoutoutMutation,
	createMarkerMutation,
} from "#lib/graphql/twitch.js";
import { dispatch } from "#lib/handlers/index.js";
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
import { duelColor, Prediction } from "./prediction.svelte";
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
 * - `joined`: channel data is loaded and the IRC join has been sent.
 * - `leaving`: IRC is being left.
 */
export type ChannelStatus = "idle" | "joining" | "joined" | "leaving";

export class Channel {
	public readonly id: string;
	public readonly chat: Chat;
	public readonly badges: ChannelBadgeManager;
	public readonly emotes: ChannelEmoteManager;
	public readonly cheermotes: CheermoteManager;
	public readonly viewers: ViewerManager;
	public readonly pinned: boolean;

	public seventvId: string | null = null;

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
	public ephemeral = $state(false);

	/**
	 * Whether the current user is banned from the channel.
	 */
	public banned = $state(false);

	/**
	 * The id of the active 7TV emote set for the channel, if any.
	 */
	public emoteSetId = $state<string | null>(null);

	#ttlTimeout: ReturnType<typeof setTimeout> | undefined;
	#status = $state<ChannelStatus>("idle");

	// Identifies the join attempt that is allowed to complete.
	#attempt: object | null = null;

	#joining: Promise<void> | null = null;
	#leaving: Promise<void> | null = null;

	#modActions = false;

	// The login the backend joined with; the user may rename meanwhile.
	#login = "";

	public constructor(
		public readonly client: TwitchClient,

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
	 * Whether live moderation actions arrive through PubSub, which depends on
	 * whether the user moderated the channel when it was joined.
	 */
	public get receivesModActions() {
		return this.joined && this.#modActions;
	}

	/**
	 * Whether the current user moderates this channel.
	 */
	public get isMod() {
		return app.user?.moderates(this.id) ?? false;
	}

	public get status() {
		return this.#status;
	}

	public get joined() {
		return this.#status === "joined";
	}

	/**
	 * Follows the current user becoming or no longer being a moderator, which
	 * changes what the backend subscribes to.
	 */
	public async setModerated(moderator: boolean) {
		if (!app.user || app.user.moderates(this.id) === moderator) return;

		app.user.setModerating(this.id, moderator);
		await this.rejoin();
	}

	/**
	 * Updates the channel's 7TV account and active emote set, following their
	 * events if joined.
	 */
	public async setSeventv(userId: string | null, emoteSetId: string | null) {
		if (userId === this.seventvId && emoteSetId === this.emoteSetId) return;

		this.seventvId = userId;
		this.emoteSetId = emoteSetId;

		// Otherwise joining sends them.
		if (this.#login) {
			await invoke("sync_seventv", {
				login: this.#login,
				id: this.id,
				stvId: userId,
				setId: emoteSetId,
			});
		}
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
		if (!this.joined || !this.#login) return;

		await this.#syncBackend();
		this.banned = false;
	}

	public setPinned(pinned: boolean) {
		const ids = storage.state.pinned.filter((id) => id !== this.id);
		storage.state.pinned = pinned ? [...ids, this.id] : ids;
	}

	/**
	 * Replaces the poll, discarding the previous one.
	 */
	public setPoll(poll: Poll | null) {
		this.poll?.dispose();
		this.poll = poll;
	}

	/**
	 * Removes the poll if it is still the given one.
	 */
	public clearPoll(poll: Poll) {
		if (this.poll === poll) this.setPoll(null);
	}

	/**
	 * Replaces the prediction, discarding the previous one.
	 */
	public setPrediction(prediction: Prediction | null) {
		this.prediction?.dispose();
		this.prediction = prediction;
	}

	/**
	 * Removes the prediction if it is still the given one.
	 */
	public clearPrediction(prediction: Prediction) {
		if (this.prediction === prediction) this.setPrediction(null);
	}

	/**
	 * Retrieves the stream of the channel; `null` if it's offline.
	 */
	public async fetchStream() {
		const { user } = await this.client.gql(streamQuery, { id: this.id });

		this.stream = user?.stream ? Stream.from(this.id, user.stream, user.channel) : null;

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

	public async startPoll(options: PollOptions) {
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

	public async startPrediction(options: PredictionOptions) {
		// GraphQL rejects two-outcome predictions without the blue/pink colors.
		const outcomes: PredictionOutcome[] = options.outcomes.map((title, i, all) => ({
			title,
			color: duelColor(i, all.length) ?? "BLUE",
		}));

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
		await this.client.gql(blockTermMutation, {
			channel: this.id,
			term,
		});
	}

	public async startRaid(to: string) {
		await this.client.gql(startRaidMutation, {
			source: this.id,
			target: to,
		});
	}

	public async cancelRaid() {
		await this.client.gql(cancelRaidMutation, { channel: this.id });
	}

	public async shoutout(to: string) {
		await this.client.gql(shoutoutMutation, {
			source: this.user.username,
			caller: app.user?.username ?? "",
			target: to,
		});
	}

	async #join() {
		const attempt = {};
		this.#attempt = attempt;

		// Rejoining only needs the previous leave to have finished; it failing
		// was already reported to whoever left.
		await Promise.allSettled([this.#leaving]);

		if (this.#attempt !== attempt) return;

		clearTimeout(this.#ttlTimeout);
		this.#status = "joining";

		if (!this.viewers.has(this.id)) {
			this.viewers.set(this.id, new Viewer(this, this.user));
		}

		// Only the stream is needed to show the channel; everything else is
		// shown once it loads, if it does.
		const optional = (what: string, task: Promise<unknown>) =>
			task.catch(log.swallow(`Failed to load ${what} of ${this.user.username}`, "warn"));

		const [stream] = await Promise.allSettled([
			this.fetchStream(),
			optional("emotes", this.emotes.fetch()),
			optional("badges", this.badges.fetch()),
			optional("cheermotes", this.cheermotes.fetch()),
			optional("pinned message", this.chat.fetchPinned()),
			optional(
				"poll",
				Poll.fetch(this).then((poll) => this.setPoll(poll)),
			),
			optional(
				"prediction",
				Prediction.fetch(this).then((prediction) => this.setPrediction(prediction)),
			),
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

		if (stream.status === "rejected") {
			this.#teardown();
			throw stream.reason;
		}

		this.#status = "joined";

		// Not awaited to avoid blocking the UI.
		this.#joinBackend().catch(log.swallow(`Failed to join ${this.user.username}`));

		if (settings.state["chat.messages.history.enabled"]) {
			void this.#loadRecentMessages();
		}
	}

	async #joinBackend() {
		await app.ready;

		// Left or logged out while waiting.
		if (this.#status !== "joined") return;

		this.#login = this.user.username;
		await this.#syncBackend();
	}

	async #syncBackend() {
		this.#modActions = this.isMod;

		await invoke("join", {
			id: this.id,
			stvId: this.seventvId,
			setId: this.emoteSetId,
			login: this.#login,
			isMod: this.#modActions,
		});
	}

	async #leave() {
		this.#status = "leaving";

		try {
			// The backend may not have joined yet if it wasn't connected.
			if (this.#login) {
				await invoke("leave", { login: this.#login });
			}
		} finally {
			this.#login = "";
			this.#leaving = null;
			this.#teardown();
		}
	}

	#teardown() {
		this.#status = "idle";

		this.#clearLive();
		this.chat.reset();
		this.viewers.clear();

		this.banned = false;

		clearTimeout(this.#ttlTimeout);

		this.#ttlTimeout = setTimeout(() => {
			this.badges.clear();
			this.emotes.clear();
			this.cheermotes.clear();
		}, TTL);
	}

	#clearLive() {
		this.setPoll(null);
		this.setPrediction(null);
		this.chat.setPin(null);
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
				await dispatch("irc", message.type, message);
			}
		} catch (error) {
			log.error(`Failed to load recent messages for ${this.user.username}`, error);
		}
	}
}
