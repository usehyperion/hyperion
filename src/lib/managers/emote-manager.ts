import { ofetch } from "ofetch";

import type { BttvEmote, GlobalSet } from "#lib/emotes.js";

import { transform7tvEmote, transformBttvEmote, transformFfzEmote } from "#lib/emotes.js";
import { ApiError } from "#lib/errors/api-error.js";
import {
	execute7tvQuery,
	globalEmoteSetQuery,
	globalEmoteSetVersionQuery,
} from "#lib/graphql/7tv.js";

import { BaseEmoteManager } from "./base-emote-manager";

export class EmoteManager extends BaseEmoteManager {
	protected override get cacheId() {
		return "global";
	}

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
		return data.sets[3].emoticons.map(transformFfzEmote);
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

		return data.map(transformBttvEmote);
	}

	/**
	 * Retrieves the list of global 7TV emotes.
	 */
	public override async fetch7tv() {
		const { emoteSets } = await execute7tvQuery(globalEmoteSetQuery);

		return emoteSets.global!.emotes.items.map((item) =>
			transform7tvEmote(item.emote, item.alias),
		);
	}

	protected override async fetch7tvVersion() {
		const { emoteSets } = await execute7tvQuery(globalEmoteSetVersionQuery);

		return emoteSets.global?.updatedAt ?? null;
	}
}
