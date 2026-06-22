import type { Poll as ApiPoll, PollStatus } from "$lib/twitch/pubsub";
import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

// Twitch keeps polls visible for a minute after they end
const LINGER_DURATION = 60 * 1000;

export interface PollChoice {
	readonly id: string;
	readonly title: string;
	votes: number;
}

/**
 * The active or recently completed poll in a channel.
 */
export class Poll {
	#expiryId: ReturnType<typeof setTimeout> | null = null;

	public readonly id: string;

	/**
	 * The title of the poll.
	 */
	public readonly title: string;

	/**
	 * The choices available in the poll.
	 */
	public readonly choices = $state<PollChoice[]>([]);

	/**
	 * The timestamp at which the poll started.
	 */
	public readonly startedTimestamp: number;

	/**
	 * The timestamp at which the poll ends.
	 */
	public readonly endsTimestamp: number;

	/**
	 * Whether the poll is hidden for the current user.
	 */
	public hidden = $state(false);

	public totalVotes = $state(0);
	public status = $state<PollStatus>("ACTIVE");

	public constructor(
		/**
		 * The channel in which the poll is active.
		 */
		public readonly channel: Channel,

		/**
		 * The user who created the poll.
		 */
		public readonly creator: User,
		data: ApiPoll,
	) {
		this.id = data.poll_id;
		this.title = data.title;

		this.startedTimestamp = new Date(data.started_at).getTime();
		this.endsTimestamp = this.startedTimestamp + data.duration_seconds * 1000;

		this.choices = data.choices.map((c) => ({
			id: c.choice_id,
			title: c.title,
			votes: c.total_voters,
		}));

		this.totalVotes = data.total_voters;
		this.status = data.status;
	}

	public update(payload: ApiPoll) {
		this.totalVotes = payload.total_voters;
		this.status = payload.status;

		for (const choice of this.choices) {
			const newVotes = payload.choices.find((c) => c.choice_id === choice.id)?.total_voters;

			if (typeof newVotes === "number") {
				choice.votes = newVotes;
			}
		}
	}

	/**
	 * Marks this poll as finished and schedules it to be cleared after a short
	 * delay so the final results remain briefly visible.
	 */
	public complete(payload: ApiPoll) {
		this.update(payload);

		this.#expiryId ??= setTimeout(() => {
			this.#expiryId = null;
			this.channel.clearPoll(this);
		}, LINGER_DURATION);
	}

	/**
	 * Ends this poll early.
	 */
	public async end() {
		if (!this.channel.isMod) return;

		await this.channel.client.patch("/polls", {
			body: {
				broadcaster_id: this.channel.id,
				id: this.id,
				status: "TERMINATED",
			},
		});
	}

	public dispose() {
		if (this.#expiryId !== null) {
			clearTimeout(this.#expiryId);
			this.#expiryId = null;
		}
	}
}
