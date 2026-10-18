import * as cache from "tauri-plugin-cache-api";

import type { Cheermote } from "#lib/graphql/twitch.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { cheermoteQuery } from "#lib/graphql/twitch.js";

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends Map<string, Cheermote> {
	public constructor(public readonly channel: Channel) {
		super();
	}

	/**
	 * Retrieves the list of cheermotes in the channel and caches them for later
	 * use.
	 */
	public async fetch(force = false) {
		if (!force && this.size) {
			return this;
		}

		let cheermotes = await cache.get<Cheermote[]>(`cheermotes:${this.channel.id}`);

		if (force || !cheermotes) {
			if (force) this.clear();

			const { user } = await this.channel.client.gql(cheermoteQuery, { id: this.channel.id });

			cheermotes = user?.cheer?.emotes.filter((e) => e != null) ?? [];
			await cache.set(`cheermotes:${this.channel.id}`, cheermotes);
		}

		for (const cheermote of cheermotes) {
			this.set(cheermote.prefix.toLowerCase(), cheermote);
		}

		return this;
	}
}
