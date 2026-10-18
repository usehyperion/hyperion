import type { Badge as ApiBadge } from "#lib/graphql/twitch.js";
import type { LoadContext } from "#lib/load-map.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";
import { Badge } from "#lib/models/badge.js";

const FRESH = 60 * 60; // 1 hour
const TTL = 30 * 24 * 60 * 60; // 30 days

export class ChannelBadgeManager extends LoadMap<string, Badge> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load({ force, update }: LoadContext<string, Badge>) {
		const badges = await cache.revalidate(`badges:${this.channel.id}`, () => this.#fetch(), {
			fresh: FRESH,
			ttl: TTL,
			force,
			onRevalidate: (badges) => update(toEntries(badges)),
		});

		return toEntries(badges);
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(channelBadgesQuery, {
			id: this.channel.id,
		});

		return (user?.broadcastBadges ?? []).filter((data) => data != null);
	}
}

function toEntries(badges: ApiBadge[]) {
	return badges.map((data) => {
		const badge = Badge.fromGql(data);
		return [badge.id, badge] as const;
	});
}
