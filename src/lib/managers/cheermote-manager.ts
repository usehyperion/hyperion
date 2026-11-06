import type { Cheermote } from "#lib/graphql/twitch.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { cheermoteQuery } from "#lib/graphql/twitch.js";
import { LoadMap } from "#lib/load-map.js";

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends LoadMap<string, Cheermote> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected async load() {
		const { user } = await this.channel.client.gql(cheermoteQuery, { id: this.channel.id });

		return (user?.cheer?.emotes ?? []).flatMap((cheermote) =>
			cheermote ? [[cheermote.prefix.toLowerCase(), cheermote] as const] : [],
		);
	}
}
