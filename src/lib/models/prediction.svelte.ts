import type { Prediction as ApiPrediction, PredictionStatus } from "$lib/twitch/pubsub";
import type { Channel } from "./channel.svelte";
import type { User } from "./user.svelte";

// Twitch keeps predictions visible for a minute after they resolve or cancel
const LINGER_DURATION = 60 * 1000;

export interface PredictionOutcome {
	readonly id: string;
	readonly title: string;
	points: number;
	users: number;
}

/**
 * The active or recently resolved prediction in a channel.
 */
export class Prediction {
	#expiryId: ReturnType<typeof setTimeout> | null = null;

	public readonly id: string;

	/**
	 * The title of the prediction.
	 */
	public readonly title: string;

	/**
	 * The outcomes viewers can predict between.
	 */
	public readonly outcomes = $state<PredictionOutcome[]>([]);

	/**
	 * The timestamp at which the prediction was created.
	 */
	public readonly createdTimestamp: number;

	/**
	 * The timestamp at which submissions lock.
	 */
	public readonly locksTimestamp: number;

	/**
	 * Whether the prediction is hidden for the current user.
	 */
	public hidden = $state(false);

	public status = $state<PredictionStatus>("ACTIVE");

	/**
	 * The id of the winning outcome once the prediction is resolved.
	 */
	public winningOutcomeId = $state<string | null>(null);

	/**
	 * The total number of channel points wagered across all outcomes.
	 */
	public readonly totalPoints = $derived(this.outcomes.reduce((sum, o) => sum + o.points, 0));

	/**
	 * The total number of users who have predicted.
	 */
	public readonly totalUsers = $derived(this.outcomes.reduce((sum, o) => sum + o.users, 0));

	public constructor(
		/**
		 * The channel in which the prediction is active.
		 */
		public readonly channel: Channel,

		/**
		 * The user who created the prediction; `null` if it was created by an
		 * extension.
		 */
		public readonly creator: User | null,
		data: ApiPrediction,
	) {
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

		this.status = data.status;
		this.winningOutcomeId = data.winning_outcome_id;
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
			this.#expiryId ??= setTimeout(() => {
				this.#expiryId = null;
				this.channel.clearPrediction(this);
			}, LINGER_DURATION);
		}
	}

	/**
	 * Locks the prediction, preventing further submissions.
	 */
	public async lock() {
		if (!this.channel.isMod || this.status !== "ACTIVE") return;

		await this.channel.client.patch("/predictions", {
			body: {
				broadcaster_id: this.channel.id,
				id: this.id,
				status: "LOCKED",
			},
		});
	}

	/**
	 * Resolves the prediction, paying out the given winning outcome.
	 */
	public async resolve(outcomeId: string) {
		if (!this.channel.isMod) return;
		if (this.status !== "ACTIVE" && this.status !== "LOCKED") return;

		await this.channel.client.patch("/predictions", {
			body: {
				broadcaster_id: this.channel.id,
				id: this.id,
				status: "RESOLVED",
				winning_outcome_id: outcomeId,
			},
		});
	}

	/**
	 * Cancels the prediction, refunding all wagered points.
	 */
	public async cancel() {
		if (!this.channel.isMod) return;
		if (this.status !== "ACTIVE" && this.status !== "LOCKED") return;

		await this.channel.client.patch("/predictions", {
			body: {
				broadcaster_id: this.channel.id,
				id: this.id,
				status: "CANCELED",
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
