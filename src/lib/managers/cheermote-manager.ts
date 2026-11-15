import type { Cheermote } from "#lib/graphql/twitch.js";
import type { LoadContext } from "#lib/load-map.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import * as cache from "#lib/cache.js";
import { cheermoteQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends LoadMap<string, Cheermote> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load(ctx: LoadContext<string, Cheermote>) {
		const cheermotes = await cache.revalidate(
			`cheermotes:${this.channel.id}`,
			() => this.#fetch(ctx.signal),
			{
				force: ctx.force,
				signal: ctx.signal,
				onRevalidate: (cheermotes) => ctx.update(toEntries(cheermotes)),
			},
		);

		return toEntries(cheermotes);
	}

	async #fetch(signal: AbortSignal) {
		const { user } = await this.channel.client.gql(
			cheermoteQuery,
			{ id: this.channel.id },
			{ signal },
		);

		return (user?.cheer?.emotes ?? []).filter((cheermote) => cheermote != null);
	}
}

function toEntries(cheermotes: Cheermote[]) {
	return cheermotes.map((cheermote) => [cheermote.prefix.toLowerCase(), cheermote] as const);
}
