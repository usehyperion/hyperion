import { ofetch } from "ofetch";

import type { BttvEmote, FfzEmoteSet } from "#lib/emotes.js";
import type { ActiveEmoteSet } from "#lib/graphql/7tv.js";
import type { Channel } from "#lib/models/channel.svelte.js";

import { transform7tvEmote, transformBttvEmote, transformFfzEmote } from "#lib/emotes.js";
import { ApiError } from "#lib/errors/api-error.js";
import { execute7tvQuery, activeEmoteSetQuery } from "#lib/graphql/7tv.js";
import { settings } from "#lib/settings/index.js";

import { BaseEmoteManager } from "./base-emote-manager";

interface Room {
	room: { set: number };
	sets: Record<number, FfzEmoteSet>;
}

interface BttvUser {
	channelEmotes: BttvEmote[];
	sharedEmotes: BttvEmote[];
}

export class ChannelEmoteManager extends BaseEmoteManager {
	public constructor(public readonly channel: Channel) {
		super();
	}

	protected override get cacheId() {
		return this.channel.id;
	}

	protected override async fetch7tvVersion() {
		const set = await this.#fetchActiveSet(false);
		return set ? `${set.id}:${set.updatedAt}` : null;
	}

	public override async fetch(force = false) {
		await Promise.all([
			super.fetch(force),
			settings.state["chat.emotes.seventv"]
				? null
				: this.#fetchActiveSet(false).catch(() => null),
		]);
	}

	/**
	 * Retrieves the list of FrankerFaceZ emotes in the channel.
	 */
	public override async fetchFfz() {
		let data: Room;

		try {
			data = await ofetch<Room>(`https://api.frankerfacez.com/v1/room/id/${this.channel.id}`);
		} catch (error) {
			const apiError = ApiError.from(error);
			if (apiError.status === 404) return [];

			throw apiError;
		}

		return data.sets[data.room.set].emoticons.map(transformFfzEmote);
	}

	/**
	 * Retrieves the list of BetterTTV emotes in the channel.
	 */
	public override async fetchBttv() {
		let data: BttvUser;

		try {
			data = await ofetch<BttvUser>(
				`https://api.betterttv.net/3/cached/users/twitch/${this.channel.id}`,
			);
		} catch (error) {
			const apiError = ApiError.from(error);
			if (apiError.status === 404) return [];
			throw apiError;
		}

		return data.channelEmotes.concat(data.sharedEmotes).map(transformBttvEmote);
	}

	/**
	 * Retrieves the active 7TV emote set for the channel.
	 */
	public override async fetch7tv() {
		const set = await this.#fetchActiveSet();
		if (!set) return [];

		return set.emotes.items.map((item) => transform7tvEmote(item.emote, item.alias));
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

		this.channel.seventvId = user?.id ?? null;
		this.channel.emoteSetId = set?.id ?? null;

		return set;
	}
}
