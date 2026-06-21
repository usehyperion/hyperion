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

export interface PubSubTopicMap {
	"community-points-channel-v1": CommunityPointsChannel;
	"pinned-chat-updates-v1": PinnedChatUpdates;
	"predictions-channel-v1": {};
	polls: {};
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
