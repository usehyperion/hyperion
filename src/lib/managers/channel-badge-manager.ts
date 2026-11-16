import type { Badge as ApiBadge } from "#lib/graphql/twitch.js";
import type { LoadContext } from "#lib/load-map.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";
import { Badge } from "#lib/models/badge.js";

export class ChannelBadgeManager extends LoadMap<string, Badge> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load(ctx: LoadContext<string, Badge>) {
		const badges = await cache.revalidate(
			`badges:${this.channel.id}`,
			() => this.#fetch(ctx.signal),
			{
				force: ctx.force,
				signal: ctx.signal,
				onRevalidate: (badges) => ctx.update(toEntries(badges)),
			},
		);

		return toEntries(badges);
	}

	async #fetch(signal: AbortSignal) {
		const { user } = await this.channel.client.gql(
			channelBadgesQuery,
			{ id: this.channel.id },
			{ signal },
		);

		return (user?.broadcastBadges ?? []).filter((data) => data != null);
	}
}

function toEntries(badges: ApiBadge[]) {
	return badges.map((data) => {
		const badge = Badge.fromGql(data);
		return [badge.id, badge] as const;
	});
}
