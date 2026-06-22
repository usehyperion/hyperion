import type { Poll as PollPayload } from "$lib/twitch/pubsub";
import type { Channel } from "./channel.svelte";
import type { Chat } from "./chat.svelte";

// How long the completed poll results stay visible before being cleared.
const COMPLETE_LINGER = 10 * 1000;

export interface PollChoiceState {
	id: string;
	title: string;
	votes: number;
}

export interface CreatePollOptions {
	title: string;
	choices: string[];
	duration: number;
	channelPointsVoting?: boolean;
	channelPointsPerVote?: number;
}

/**
 * The active or recently completed poll in a chat.
 */
export class Poll {
	#removalId: ReturnType<typeof setTimeout> | null = null;

	public readonly id: string;

	public title = $state("");
	public choices = $state<PollChoiceState[]>([]);
	public totalVotes = $state(0);
	public status = $state<"ACTIVE" | "COMPLETED" | "TERMINATED">("ACTIVE");

	/**
	 * The timestamp at which the poll started.
	 */
	public startedAt = $state(0);

	/**
	 * The timestamp at which the poll ends.
	 */
	public endsAt = $state(0);

	public constructor(
		public readonly chat: Chat,
		payload: PollPayload,
	) {
		this.id = payload.poll_id;
		this.#apply(payload);
	}

	/**
	 * Creates a new poll in the given channel. The resulting poll is delivered
	 * through the `polls` PubSub topic rather than returned here.
	 */
	public static async create(channel: Channel, options: CreatePollOptions) {
		if (!channel.isMod) return;

		await channel.client.post("/polls", {
			body: {
				broadcaster_id: channel.id,
				title: options.title,
				choices: options.choices.map((title) => ({ title })),
				duration: options.duration,
				...(options.channelPointsVoting && {
					channel_points_voting_enabled: true,
					channel_points_per_vote: options.channelPointsPerVote ?? 0,
				}),
			},
		});
	}

	/**
	 * Updates this poll's reactive state from a fresh PubSub payload.
	 */
	public update(payload: PollPayload) {
		this.#apply(payload);
	}

	/**
	 * Marks this poll as finished and schedules it to be cleared after a short
	 * delay so the final results remain briefly visible.
	 */
	public complete(payload: PollPayload) {
		this.#apply(payload);
		this.status = payload.ended_by ? "TERMINATED" : "COMPLETED";

		this.#removalId ??= setTimeout(() => {
			this.#removalId = null;
			this.chat.clearPoll(this);
		}, COMPLETE_LINGER);
	}

	/**
	 * Ends this poll early.
	 */
	public async terminate() {
		if (!this.chat.channel.isMod) return;

		await this.chat.channel.client.patch("/polls", {
			body: {
				broadcaster_id: this.chat.channel.id,
				id: this.id,
				status: "TERMINATED",
			},
		});
	}

	public dispose() {
		if (this.#removalId !== null) {
			clearTimeout(this.#removalId);
			this.#removalId = null;
		}
	}

	#apply(payload: PollPayload) {
		this.title = payload.title;
		this.totalVotes = payload.votes.total;
		this.choices = payload.choices.map((choice) => ({
			id: choice.choice_id,
			title: choice.title,
			votes: choice.votes.total,
		}));

		this.startedAt = new Date(payload.started_at).getTime();
		this.endsAt = this.startedAt + payload.duration_seconds * 1000;
	}
}
