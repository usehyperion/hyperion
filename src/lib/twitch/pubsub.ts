export interface ChannelPointReward {
	id: string;
	title: string;
	cost: number;
	background_color: string;
	is_user_input_required: boolean;
}

export interface ChannelPointRedemption {
	id: string;
	channel_id: string;
	redeemed_at: string;
	reward: ChannelPointReward;
	status: string;
	user: { id: string };
	user_input: string;
}

export interface CommunityPointsChannel {
	type: "reward-redeemed";
	data: {
		redemption: ChannelPointRedemption;
		timestamp: number;
	};
}

// This is mainly used as a signal; most fields can be ignored
export interface PinnedChatUpdates {
	type: "pin-message" | "unpin-message" | "update-message";
	updated_at?: number;
}

export interface PollChoice {
	choice_id: string;
	title: string;
	total_voters: number;
}

export type PollStatus =
	| "UNKNOWN"
	| "ACTIVE"
	| "COMPLETED"
	| "TERMINATED"
	| "ARCHIVED"
	| "MODERATED";

export interface Poll {
	choices: PollChoice[];
	created_by: string;
	duration_seconds: number;
	ended_at: string | null;
	ended_by: string | null;
	owned_by: string;
	poll_id: string;
	started_at: string;
	status: PollStatus;
	title: string;
	total_voters: number;
}

export interface Polls {
	type: "POLL_CREATE" | "POLL_UPDATE" | "POLL_COMPLETE" | "POLL_TERMINATE";
	data: {
		poll: Poll;
	};
}

export interface PredictionOutcome {
	id: string;
	title: string;
	total_points: number;
	total_users: number;
}

export type PredictionStatus =
	| "ACTIVE"
	| "LOCKED"
	| "RESOLVE_PENDING"
	| "RESOLVED"
	| "CANCEL_PENDING"
	| "CANCELED";

export interface Prediction {
	id: string;
	title: string;
	channel_id: string;
	created_at: string;
	created_by: { type: string; user_id?: string };
	ended_at: string | null;
	ended_by: { user_id?: string } | null;
	locked_at: string | null;
	locked_by: { user_id?: string } | null;
	outcomes: PredictionOutcome[];
	status: PredictionStatus;
	prediction_window_seconds: number;
	winning_outcome_id: string | null;
}

export interface PredictionsChannel {
	type: "event-created" | "event-updated";
	data: {
		event: Prediction;
	};
}

export interface PredictionsUser {}

export interface PubSubTopicMap {
	"community-points-channel-v1": CommunityPointsChannel;
	"pinned-chat-updates-v1": PinnedChatUpdates;
	"predictions-channel-v1": PredictionsChannel;
	polls: Polls;
	"predictions-user-v1": PredictionsUser;
}

export type PubSubMessage<K extends keyof PubSubTopicMap> = PubSubTopicMap[K] & {
	target_id: string;
};

export type PubSubTopic = {
	[K in keyof PubSubTopicMap]: {
		topic: K;
		message: PubSubMessage<K>;
	};
}[keyof PubSubTopicMap];
