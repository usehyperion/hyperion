import type { SevenTvEventMap } from "#lib/seventv.js";
import type { IrcMessageMap } from "#lib/twitch/irc.js";
import type { PubSubMessage, PubSubTopicMap } from "#lib/twitch/pubsub.js";

type HandlerKey = keyof IrcMessageMap | keyof PubSubTopicMap | keyof SevenTvEventMap;

type HandlerData<K> = K extends keyof IrcMessageMap
	? IrcMessageMap[K]
	: K extends keyof PubSubTopicMap
		? PubSubMessage<K>
		: K extends keyof SevenTvEventMap
			? SevenTvEventMap[K]
			: never;

export interface Handler<K> {
	name: K;
	handle: (data: HandlerData<K>) => Promise<void> | void;
}

export function defineHandler<K extends HandlerKey>(handler: Handler<K>) {
	return handler;
}
