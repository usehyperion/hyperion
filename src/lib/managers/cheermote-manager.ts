import type { Cheermote } from "#lib/graphql/twitch.js";
import type { LoadContext } from "#lib/load-map.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { cheermoteQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";

const FRESH = 60 * 60; // 1 hour
const TTL = 30 * 24 * 60 * 60; // 30 days

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends LoadMap<string, Cheermote> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load({ force, update }: LoadContext<string, Cheermote>) {
		const cheermotes = await cache.revalidate(
			`cheermotes:${this.channel.id}`,
			() => this.#fetch(),
			{
				fresh: FRESH,
				ttl: TTL,
				force,
				onRevalidate: (cheermotes) => update(toEntries(cheermotes)),
			},
		);

		return toEntries(cheermotes);
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(cheermoteQuery, { id: this.channel.id });

		return (user?.cheer?.emotes ?? []).filter((cheermote) => cheermote != null);
	}
}

function toEntries(cheermotes: Cheermote[]) {
	return cheermotes.map((cheermote) => [cheermote.prefix.toLowerCase(), cheermote] as const);
}
