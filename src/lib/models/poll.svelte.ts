import type { ViewablePoll } from "#lib/graphql/twitch.js";
import type { Poll as ApiPoll, PollStatus } from "#lib/twitch/pubsub.js";

import { pollQuery, terminatePollMutation } from "#lib/graphql/twitch.js";

import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

import { Notice } from "./notice.svelte";

// Twitch keeps polls visible for a minute after they end
const LINGER_DURATION = 60 * 1000;

export interface PollChoice {
	readonly id: string;
	readonly title: string;
	votes: number;
}

function fromGql(channel: string, poll: ViewablePoll): ApiPoll {
	return {
		poll_id: poll.id,
		choices: poll.choices,
		created_by: poll.createdBy?.id ?? "",
		duration_seconds: poll.durationSeconds,
		ended_at: poll.endedAt,
		ended_by: poll.endedBy?.id ?? null,
		owned_by: channel,
		started_at: poll.startedAt,
		status: poll.status,
		title: poll.title,
		total_voters: poll.totalVoters,
	};
}

/**
 * The active or recently completed poll in a channel.
 */
export class Poll extends Notice {
	public readonly id: string;
	public readonly title: string;
	public readonly choices = $state<PollChoice[]>([]);
	public readonly startedTimestamp: number;
	public readonly endsTimestamp: number;

	public totalVotes = $state(0);
	public status = $state<PollStatus>("ACTIVE");

	/**
	 * Whether the poll is still accepting votes.
	 */
	public readonly active = $derived(this.status === "ACTIVE");

	public constructor(
		public readonly channel: Channel,

		/**
		 * The user who created the poll; `null` if unknown.
		 */
		public readonly creator: User | null,
		data: ApiPoll,
	) {
		super();

		this.id = data.poll_id;
		this.title = data.title;

		this.startedTimestamp = new Date(data.started_at).getTime();
		this.endsTimestamp = this.startedTimestamp + data.duration_seconds * 1000;

		this.choices = data.choices.map((c) => ({
			id: c.choice_id,
			title: c.title,
			votes: c.total_voters,
		}));

		this.update(data);
	}

	/**
	 * Retrieves the poll in the channel if one is visible.
	 */
	public static async fetch(channel: Channel) {
		const { user } = await channel.client.gql(pollQuery, { id: channel.id });
		if (!user?.viewablePoll) return null;

		const { createdBy } = user.viewablePoll;
		const creator = createdBy ? channel.client.users.from(createdBy) : null;

		return new Poll(channel, creator, fromGql(channel.id, user.viewablePoll));
	}

	public update(payload: ApiPoll) {
		this.totalVotes = payload.total_voters;
		this.status = payload.status;

		for (const choice of this.choices) {
			const votes = payload.choices.find((c) => c.choice_id === choice.id)?.total_voters;

			if (typeof votes === "number") {
				choice.votes = votes;
			}
		}

		// Polls can already be over when first seen, e.g. when joining a
		// channel within a minute of one ending.
		if (!this.active && this.status !== "UNKNOWN") {
			this.expireAfter(payload.ended_at, LINGER_DURATION);
		}
	}

	/**
	 * Ends the poll early.
	 */
	public async end() {
		await this.channel.client.gql(terminatePollMutation, { poll: this.id });
	}

	protected remove() {
		this.channel.clearPoll(this);
	}
}
