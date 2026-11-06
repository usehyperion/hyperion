import type { Channel } from "#lib/models/channel.svelte.js";

import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";
import { Badge } from "#lib/models/badge.js";

export class ChannelBadgeManager extends LoadMap<string, Badge> {
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
