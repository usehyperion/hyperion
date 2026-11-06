import type { Channel } from "#lib/models/channel.svelte.js";

import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { Badge } from "#lib/models/badge.js";

import { LoadedMap } from "./loaded-map";

export class ChannelBadgeManager extends LoadedMap<string, Badge> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load() {
		const { user } = await this.channel.client.gql(channelBadgesQuery, {
			id: this.channel.id,
		});

		return (user?.broadcastBadges ?? []).flatMap((data) => {
			if (!data) return [];

			const badge = Badge.fromGql(data);
			return [[badge.id, badge] as const];
		});
	}
}
