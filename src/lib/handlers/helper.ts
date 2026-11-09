import type { Channel } from "#lib/models/channel.svelte.js";
import type { SevenTvEventMap, SevenTvUser } from "#lib/seventv.js";
import type { IrcMessageMap } from "#lib/twitch/irc.js";
import type { PubSubData, PubSubTopicMap } from "#lib/twitch/pubsub.js";

import { twitchConnection } from "#lib/seventv.js";

interface SourceData {
	irc: IrcMessageMap;
	pubsub: { [K in keyof PubSubTopicMap]: PubSubData<K> };
	seventv: SevenTvEventMap;
}

export type Source = keyof SourceData;

export interface Handler {
	source: Source;
	name: string;
	handle: (data: any) => Promise<void> | void;
}

export function defineHandler<S extends Source, K extends keyof SourceData[S] & string>(
	source: S,
	handler: { name: K; handle: (data: SourceData[S][K]) => Promise<void> | void },
): Handler {
	return { source, ...handler };
}

export function reportedByPubSub(channel: Channel, recent: boolean) {
	return !recent && channel.receivesModActions;
}

export async function seventvActor(channel: Channel, user: SevenTvUser) {
	const twitch = twitchConnection(user);
	return twitch ? channel.viewers.fetch(twitch.id).catch(() => null) : null;
}
