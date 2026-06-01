import { betterFetch as fetch } from "@better-fetch/fetch";
import * as cache from "tauri-plugin-cache-api";
import { transform7tvEmote, transformBttvEmote, transformFfzEmote } from "$lib/emotes";
import type { BttvEmote, Emote, GlobalSet } from "$lib/emotes";
import { ApiError } from "$lib/errors/api-error";
import { send7tv } from "$lib/graphql";
import { globalEmoteSetQuery } from "$lib/graphql/7tv";
import { BaseEmoteManager } from "./base-emote-manager";

export class EmoteManager extends BaseEmoteManager {
	public override async fetch(force = false) {
		let emotes = await cache.get<Emote[]>("global_emotes");

		if (force || !emotes) {
			if (force) this.clear();

			emotes = await super.fetch();
			await cache.set("global_emotes", emotes, { ttl: 7 * 24 * 60 * 60 });
		} else {
			this.addAll(emotes);
		}

		return emotes;
	}

	/**
	 * Retrieves the list of global FrankerFaceZ emotes.
	 */
	public override async fetchFfz() {
		const { data, error } = await fetch<GlobalSet>(
			"https://api.frankerfacez.com/v1/set/global",
		);

		if (error) {
			throw new ApiError(error.status, error.statusText);
		}

		// 3 is the global set id
		const emotes = data.sets[3].emoticons.map(transformFfzEmote);
		this.addAll(emotes);

		return emotes;
	}

	/**
	 * Retrieves the list of global BetterTTV emotes.
	 */
	public override async fetchBttv() {
		const { data, error } = await fetch<BttvEmote[]>(
			"https://api.betterttv.net/3/cached/emotes/global",
		);

		if (error) {
			throw new ApiError(error.status, error.statusText);
		}

		const emotes = data.map(transformBttvEmote);
		this.addAll(emotes);

		return emotes;
	}

	/**
	 * Retrieves the list of global 7TV emotes.
	 */
	public override async fetch7tv() {
		const { emoteSets } = await send7tv(globalEmoteSetQuery);

		const emotes = emoteSets.global!.emotes.items.map((item) =>
			transform7tvEmote(item.emote, item.alias),
		);

		this.addAll(emotes);

		return emotes;
	}
}
