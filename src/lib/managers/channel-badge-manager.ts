import type { Channel } from "#lib/models/channel.svelte.js";

import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { Badge } from "#lib/models/badge.js";
import { once } from "#lib/util.js";

export class ChannelBadgeManager extends Map<string, Badge> {
	readonly #load = once(() => this.#fetch());

	public constructor(public readonly channel: Channel) {
		super();
	}

	public override clear() {
		this.#load.reset();
		super.clear();
	}

	/**
	 * Retrieves the list of badges in the channel if they haven't been
	 * retrieved yet.
	 */
	public async fetch(force = false) {
		if (force) this.#load.reset();

		await this.#load();

		return this;
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(channelBadgesQuery, {
			id: this.channel.id,
		});

		// Not this.clear(), which would forget the load in progress.
		super.clear();

		for (const data of user?.broadcastBadges ?? []) {
			if (!data) continue;

			const badge = Badge.fromGql(data);
			this.set(badge.id, badge);
		}
	}
}
