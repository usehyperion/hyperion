import type { PredictionDetails } from "#lib/graphql/twitch.js";
import type { Prediction as ApiPrediction, PredictionStatus } from "#lib/twitch/pubsub.js";

import {
	cancelPredictionMutation,
	lockPredictionMutation,
	predictionQuery,
	resolvePredictionMutation,
} from "#lib/graphql/twitch.js";

import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

import { Notice } from "./notice.svelte";

// Twitch keeps predictions visible for a minute after they resolve or cancel
const LINGER_DURATION = 60 * 1000;

export interface PredictionOutcome {
	readonly id: string;
	readonly title: string;
	points: number;
	users: number;
}

/**
 * Twitch colors the two outcomes of a two-outcome prediction blue and pink;
 * returns `null` for predictions with more outcomes.
 */
export function duelColor(index: number, count: number): "BLUE" | "PINK" | null {
	if (count !== 2) return null;

	return index === 0 ? "BLUE" : "PINK";
}

function fromGql(channel: string, prediction: PredictionDetails): ApiPrediction {
	return {
		channel_id: channel,
		id: prediction.id,
		title: prediction.title,
		created_at: prediction.createdAt,
		created_by: {
			type: prediction.createdBy?.__typename?.toUpperCase() ?? "",
			user_id: prediction.createdBy?.id,
		},
		ended_at: prediction.endedAt,
		ended_by: { user_id: prediction.endedBy?.id },
		locked_at: prediction.lockedAt,
		locked_by: { user_id: prediction.lockedBy?.id },
		outcomes: prediction.outcomes,
		status: prediction.status,
		prediction_window_seconds: prediction.predictionWindowSeconds,
		winning_outcome_id: null,
	};
}

/**
 * The active or recently resolved prediction in a channel.
 */
export class Prediction extends Notice {
	public readonly id: string;

	public readonly title: string;

	public readonly outcomes = $state<PredictionOutcome[]>([]);

	public readonly createdTimestamp: number;

	/**
	 * The timestamp at which submissions lock.
	 */
	public readonly locksTimestamp: number;

	public status = $state<PredictionStatus>("ACTIVE");

	/**
	 * The id of the winning outcome once the prediction is resolved.
	 */
	public winningOutcomeId = $state<string | null>(null);

	/**
	 * Whether the prediction can still be resolved or canceled.
	 */
	public readonly open = $derived(this.status === "ACTIVE" || this.status === "LOCKED");

	public readonly totalPoints = $derived(this.outcomes.reduce((sum, o) => sum + o.points, 0));

	public readonly totalUsers = $derived(this.outcomes.reduce((sum, o) => sum + o.users, 0));

	public constructor(
		public readonly channel: Channel,

		/**
		 * The user who created the prediction; `null` if it was created by an
		 * extension.
		 */
		public readonly creator: User | null,
		data: ApiPrediction,
	) {
		super();

		this.id = data.id;
		this.title = data.title;

		this.createdTimestamp = new Date(data.created_at).getTime();
		this.locksTimestamp = this.createdTimestamp + data.prediction_window_seconds * 1000;

		this.outcomes = data.outcomes.map((o) => ({
			id: o.id,
			title: o.title,
			points: o.total_points,
			users: o.total_users,
		}));

		this.update(data);
	}

	/**
	 * Retrieves the active or locked prediction in the channel if there is one.
	 */
	public static async fetch(channel: Channel) {
		const { channel: data } = await channel.client.gql(predictionQuery, { id: channel.id });

		const prediction = data?.active?.[0] ?? data?.locked?.[0];
		if (!prediction) return null;

		const creator =
			prediction.createdBy?.__typename === "User"
				? channel.client.users.from(prediction.createdBy)
				: null;

		return new Prediction(channel, creator, fromGql(channel.id, prediction));
	}

	public update(payload: ApiPrediction) {
		this.status = payload.status;
		this.winningOutcomeId = payload.winning_outcome_id;

		for (const outcome of this.outcomes) {
			const updated = payload.outcomes.find((o) => o.id === outcome.id);

			if (updated) {
				outcome.points = updated.total_points;
				outcome.users = updated.total_users;
			}
		}

		if (this.status === "RESOLVED" || this.status === "CANCELED") {
			this.expireAfter(payload.ended_at, LINGER_DURATION);
		}
	}

	/**
	 * Locks the prediction, preventing further submissions.
	 */
	public async lock() {
		await this.channel.client.gql(lockPredictionMutation, { prediction: this.id });
	}

	/**
	 * Resolves the prediction, paying out the given winning outcome.
	 */
	public async resolve(outcomeId: string) {
		await this.channel.client.gql(resolvePredictionMutation, {
			prediction: this.id,
			outcome: outcomeId,
		});
	}

	/**
	 * Cancels the prediction, refunding all wagered points.
	 */
	public async cancel() {
		await this.channel.client.gql(cancelPredictionMutation, { prediction: this.id });
	}

	protected remove() {
		this.channel.clearPrediction(this);
	}
}
