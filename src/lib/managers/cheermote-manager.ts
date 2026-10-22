import type { Cheermote } from "#lib/graphql/twitch.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { cheermoteQuery } from "#lib/graphql/twitch.js";

const FRESH = 60 * 60; // 1 hour
const TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends Map<string, Cheermote> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	/**
	 * Retrieves the list of cheermotes in the channel. Cached cheermotes are
	 * used immediately and refreshed in the background if stale.
	 */
	public async fetch(force = false) {
		if (!force && this.size) {
			return this;
		}

		if (force) this.clear();

		const cheermotes = await cache.revalidate(
			`cheermotes:${this.channel.id}`,
			() => this.#fetch(),
			{
				fresh: FRESH,
				ttl: TTL,
				force,
				onRevalidate: (cheermotes) => {
					this.clear();
					this.#addAll(cheermotes);
				},
			},
		);

		this.#addAll(cheermotes);

		return this;
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(cheermoteQuery, {
			id: this.channel.id,
		});

		return user?.cheer?.emotes.filter((e) => e != null) ?? [];
	}

	#addAll(cheermotes: Cheermote[]) {
		for (const cheermote of cheermotes) {
			this.set(cheermote.prefix.toLowerCase(), cheermote);
		}
	}
}
