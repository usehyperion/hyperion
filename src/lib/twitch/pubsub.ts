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

export interface PubSubTopicMap {
	"community-points-channel-v1": CommunityPointsChannel;
	"pinned-chat-updates-v1": PinnedChatUpdates;
	"predictions-channel-v1": {};
	polls: Polls;
	"predictions-user-v1": {};
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
