import type { BttvEmote, FfzEmoteSet } from "#lib/emotes.js";
import type { ActiveEmoteSet } from "#lib/graphql/7tv.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { transformBttvEmote, transformFfzEmote, transformGql7tvEmote } from "#lib/emotes.js";
import { execute7tvQuery, activeEmoteSetQuery } from "#lib/graphql/7tv.js";
import { fetchJson } from "#lib/http.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings.js";

import { BaseEmoteManager } from "./base-emote-manager";

interface Room {
	room: { set: number };
	sets: Record<number, FfzEmoteSet>;
}

interface BttvUser {
	channelEmotes: BttvEmote[];
	sharedEmotes: BttvEmote[];
}

/**
 * The emotes of a channel from each third-party provider. Channels without an
 * account on a provider have no emotes from it.
 */
export class ChannelEmoteManager extends BaseEmoteManager {
	protected readonly loaders = {
		FrankerFaceZ: async () => {
			const data = await fetchJson<Room | null>(
				`https://api.frankerfacez.com/v1/room/id/${this.channel.id}`,
				{ notFound: null },
			);

			return data?.sets[data.room.set].emoticons.map(transformFfzEmote) ?? [];
		},
		BetterTTV: async () => {
			const data = await fetchJson<BttvUser | null>(
				`https://api.betterttv.net/3/cached/users/twitch/${this.channel.id}`,
				{ notFound: null },
			);

			return data
				? [...data.channelEmotes, ...data.sharedEmotes].map(transformBttvEmote)
				: [];
		},
		"7TV": async () => {
			const set = await this.#fetchActiveSet();

			return (
				set?.emotes.items.map((item) => transformGql7tvEmote(item.emote, item.alias)) ?? []
			);
		},
	};

	public constructor(public readonly channel: Channel) {
		super();
	}

	public override async fetch(force = false) {
		const loading7tv =
			settings.state["chat.emotes.seventv"] && (force || !this.isLoaded("7TV"));

		await Promise.all([
			super.fetch(force),
			// Loading 7TV emotes already resolves the channel's 7TV user, so
			// only look it up separately when they aren't being loaded.
			loading7tv ? null : this.#syncActiveSet(),
		]);
	}

	async #fetchActiveSet(): Promise<ActiveEmoteSet | null>;
	async #fetchActiveSet(details: false): Promise<ActiveEmoteSet<false> | null>;
	async #fetchActiveSet(details = true): Promise<ActiveEmoteSet<boolean> | null> {
		const { users } = await execute7tvQuery(activeEmoteSetQuery, {
			id: this.channel.id,
			details,
		});

		const user = users.userByConnection;
		const set = user?.style.activeEmoteSet ?? null;

		await this.channel.setSeventv(user?.id ?? null, set?.id ?? null);

		return set;
	}

	async #syncActiveSet() {
		try {
			const previous = this.channel.emoteSetId;
			const set = await this.#fetchActiveSet(false);

			if (this.isLoaded("7TV") && (set?.id ?? null) !== previous) {
				await this.load("7TV");
			}
		} catch (error) {
			// The channel still works without knowing its 7TV user.
			log.warn(`Failed to sync the 7TV emote set of ${this.channel.id}`, error);
		}
	}
}
