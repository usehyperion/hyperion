import type { Cheermote } from "#lib/graphql/twitch.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { cheermoteQuery } from "#lib/graphql/twitch.js";
import { once } from "#lib/util.js";

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends Map<string, Cheermote> {
	readonly #load = once(() => this.#fetch());

	public constructor(public readonly channel: Channel) {
		super();
	}

	public override clear() {
		this.#load.reset();
		super.clear();
	}

	/**
	 * Retrieves the list of cheermotes in the channel if they haven't been
	 * retrieved yet.
	 */
	public async fetch(force = false) {
		if (force) this.#load.reset();

		await this.#load();

		return this;
	}

	async #fetch() {
		const { user } = await this.channel.client.gql(cheermoteQuery, { id: this.channel.id });

		// Not this.clear(), which would forget the load in progress.
		super.clear();

		for (const cheermote of user?.cheer?.emotes ?? []) {
			if (cheermote) this.set(cheermote.prefix.toLowerCase(), cheermote);
		}
	}
}
