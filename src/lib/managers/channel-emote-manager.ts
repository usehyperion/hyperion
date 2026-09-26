import { ofetch } from "ofetch";
import * as cache from "tauri-plugin-cache-api";

import type { BttvEmote, Emote, FfzEmoteSet } from "$lib/emotes";
import { transform7tvEmote, transformBttvEmote, transformFfzEmote } from "$lib/emotes";
import { ApiError } from "$lib/errors/api-error";
import { send7tv as send } from "$lib/graphql";
import type { ActiveEmoteSet } from "$lib/graphql/7tv";
import { activeEmoteSetQuery } from "$lib/graphql/7tv";
import type { Channel } from "$lib/models/channel.svelte";
import { settings } from "$lib/settings";

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

	public override async fetch(force = false) {
		let emotes = await cache.get<Emote[]>(`emotes:${this.channel.id}`);

		if (force || !emotes) {
			if (force) this.clear();

			const [fetched] = await Promise.all([
				super.fetch(),
				// fetch7tv resolves the channel's 7TV user, so only look it up
				// separately when 7TV emotes are disabled
				settings.state["chat.emotes.seventv"]
					? null
					: this.#fetchActiveSet(false).catch(() => null),
			]);

			emotes = fetched;
			await cache.set(`emotes:${this.channel.id}`, emotes);
		} else {
			await this.#fetchActiveSet(false);
			this.addAll(emotes);
		}

		return emotes;
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

		const emotes = data.sets[data.room.set].emoticons.map(transformFfzEmote);
		this.addAll(emotes);

		return emotes;
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

		const emotes = data.channelEmotes.concat(data.sharedEmotes).map(transformBttvEmote);
		this.addAll(emotes);

		return emotes;
	}

	/**
	 * Retrieves the active 7TV emote set for the channel.
	 */
	public override async fetch7tv() {
		const set = await this.#fetchActiveSet();
		if (!set) return [];

		const emotes = set.emotes.items.map((item) => transform7tvEmote(item.emote, item.alias));
		this.addAll(emotes);

		return emotes;
	}

	async #fetchActiveSet(): Promise<ActiveEmoteSet | null>;
	async #fetchActiveSet(details: false): Promise<ActiveEmoteSet<false> | null>;
	async #fetchActiveSet(details = true): Promise<ActiveEmoteSet<boolean> | null> {
		const { users } = await send(activeEmoteSetQuery, {
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
