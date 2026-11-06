import { SvelteMap } from "svelte/reactivity";

import type { User } from "#lib/models/user.svelte.js";
import type { TwitchClient } from "#lib/twitch/client.js";

import { streamsQuery } from "#lib/graphql/twitch.js";
import { Channel } from "#lib/models/channel.svelte.js";
import { Stream } from "#lib/models/stream.svelte.js";
import { chunk } from "#lib/util.js";

export class ChannelManager extends SvelteMap<string, Channel> {
	// Channels that are known but not listed, e.g. shared chat sources.
	readonly #unlisted = new Map<string, Promise<Channel>>();

	public constructor(public readonly client: TwitchClient) {
		super();
	}

	public getByLogin(login: string) {
		return this.values().find((c) => c.user.username === login);
	}

	public add(user: User, stream: Stream | null = null) {
		const channel = new Channel(this.client, user, stream);
		this.set(channel.id, channel);

		return channel;
	}

	/**
	 * Refreshes which channels are live.
	 */
	public async refreshStreams() {
		// Twitch looks up at most 100 users per request.
		const pages = await Promise.all(
			chunk(this.keys().toArray(), 100).map((ids) => this.client.gql(streamsQuery, { ids })),
		);

		const live = new Map(
			pages.flatMap(({ users }) =>
				(users ?? []).flatMap((user) => (user?.stream ? [[user.id, user] as const] : [])),
			),
		);

		for (const channel of this.values()) {
			const user = live.get(channel.id);
			channel.stream = user?.stream ? Stream.from(user.id, user.stream, user.channel) : null;
		}
	}

	/**
	 * Retrieves the channel without listing it if it isn't known yet.
	 */
	public async fetchUnlisted(id: string) {
		const listed = this.get(id);
		if (listed) return listed;

		return this.#unlisted.getOrInsertComputed(id, () =>
			this.client.users.fetch(id).then(
				(user) => new Channel(this.client, user),
				(error: unknown) => {
					// Let the next lookup try again.
					this.#unlisted.delete(id);
					throw error;
				},
			),
		);
	}

	public override clear() {
		this.#unlisted.clear();
		super.clear();
	}
}
