export interface PubSubTopicMap {
	"channel-points-channel-v1": {};
	"pinned-chat-updates-v1": {};
	"predictions-channel-v1": {};
	polls: {};
	"predictions-user-v1": {};
}

export type PubSubTopic = {
	[K in keyof PubSubTopicMap]: {
		topic: K;
		message: PubSubTopicMap[K] & { target_id: string };
	};
}[keyof PubSubTopicMap];
