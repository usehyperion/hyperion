import type { Channel } from "#lib/models/channel.svelte.js";

import { channelBadgesQuery } from "#lib/graphql/twitch.js";
import { Badge } from "#lib/models/badge.js";

export class ChannelBadgeManager extends Map<string, Badge> {
	#pending: Promise<void> | null = null;
	#loaded = false;

	public constructor(public readonly channel: Channel) {
		super();
	}

	public override clear() {
		this.#loaded = false;
		super.clear();
	}

	/**
	 * Retrieves the list of badges in the channel if they haven't been
	 * retrieved yet.
	 */
	public async fetch(force = false) {
		if (!force && this.#loaded) {
			return this;
		}

		if (force || !this.#pending) {
			this.#pending = this.#fetch();
		}

		const pending = this.#pending;

		try {
			await pending;
		} finally {
			if (this.#pending === pending) this.#pending = null;
		}

		return this;
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(channelBadgesQuery, {
			id: this.channel.id,
		});

		this.clear();

		for (const data of user?.broadcastBadges ?? []) {
			if (!data) continue;

			const badge = Badge.fromGql(data);
			this.set(badge.id, badge);
		}

		this.#loaded = true;
	}
}
