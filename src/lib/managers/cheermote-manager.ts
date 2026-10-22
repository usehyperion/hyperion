import type { Cheermote } from "#lib/graphql/twitch.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { cheermoteQuery } from "#lib/graphql/twitch.js";

/**
 * The cheermotes in a channel keyed by their lowercased prefix.
 */
export class CheermoteManager extends Map<string, Cheermote> {
	#pending: Promise<void> | null = null;

	public constructor(public readonly channel: Channel) {
		super();
	}

	/**
	 * Retrieves the list of cheermotes in the channel if they haven't been
	 * retrieved yet.
	 */
	public async fetch(force = false) {
		if (!force && this.size) {
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
		const { user } = await this.channel.client.gql(cheermoteQuery, { id: this.channel.id });

		this.clear();

		for (const cheermote of user?.cheer?.emotes ?? []) {
			if (cheermote) this.set(cheermote.prefix.toLowerCase(), cheermote);
		}
	}
}
