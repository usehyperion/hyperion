import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { Badge } from "#lib/models/badge.js";

export class ChannelBadgeManager extends Map<string, Badge> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	/**
	 * Retrieves the list of badges in the channel and caches them for later
	 * use.
	 */
	public async fetch(force = false) {
		if (!force && this.size) {
			return this;
		}

		let badges = await cache.get<Badge[]>(`badges:${this.channel.id}`);

		if (force || !badges) {
			if (force) this.clear();

			const { user } = await this.channel.client.gql(channelBadgesQuery, {
				id: this.channel.id,
			});

			badges = user?.broadcastBadges?.flatMap((b) => (b ? [Badge.fromGql(b)] : [])) ?? [];

			await cache.set(`badges:${this.channel.id}`, badges);
		}

		for (const badge of badges) {
			this.set(badge.id, badge);
		}

		return this;
	}
}
