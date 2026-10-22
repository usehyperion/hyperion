import { ofetch } from "ofetch";

import type { BttvEmote, GlobalSet } from "#lib/emotes.js";

import { transform7tvEmote, transformBttvEmote, transformFfzEmote } from "#lib/emotes.js";
import { ApiError } from "#lib/errors/api-error.js";
import { execute7tvQuery, globalEmoteSetQuery } from "#lib/graphql/7tv.js";

import { BaseEmoteManager } from "./base-emote-manager";

export class EmoteManager extends BaseEmoteManager {
	/**
	 * Retrieves the list of global FrankerFaceZ emotes.
	 */
	public override async fetchFfz() {
		let data: GlobalSet;

		try {
			data = await ofetch<GlobalSet>("https://api.frankerfacez.com/v1/set/global");
		} catch (error) {
			throw ApiError.from(error);
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
		let data: BttvEmote[];

		try {
			data = await ofetch<BttvEmote[]>("https://api.betterttv.net/3/cached/emotes/global");
		} catch (error) {
			throw ApiError.from(error);
		}

		const emotes = data.map(transformBttvEmote);
		this.addAll(emotes);

		return emotes;
	}

	/**
	 * Retrieves the list of global 7TV emotes.
	 */
	public override async fetch7tv() {
		const { emoteSets } = await execute7tvQuery(globalEmoteSetQuery);

		const emotes = emoteSets.global!.emotes.items.map((item) =>
			transform7tvEmote(item.emote, item.alias),
		);

		this.addAll(emotes);

		return emotes;
	}
}
