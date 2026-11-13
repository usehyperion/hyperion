import type { BttvEmote, GlobalSet } from "#lib/emotes.js";

import { transformBttvEmote, transformFfzEmote, transformGql7tvEmote } from "#lib/emotes.js";
import {
	execute7tvQuery,
	globalEmoteSetQuery,
	globalEmoteSetVersionQuery,
} from "#lib/graphql/7tv.js";
import { fetchJson } from "#lib/http.js";

import { BaseEmoteManager } from "./base-emote-manager";

const FFZ_GLOBAL_SET = 3;

/**
 * The global emotes of each third-party provider.
 */
export class EmoteManager extends BaseEmoteManager {
	protected readonly cacheId = "global";

	protected readonly loaders = {
		async FrankerFaceZ() {
			const data = await fetchJson<GlobalSet>("https://api.frankerfacez.com/v1/set/global");

			return data.sets[FFZ_GLOBAL_SET].emoticons.map(transformFfzEmote);
		},
		async BetterTTV() {
			const data = await fetchJson<BttvEmote[]>(
				"https://api.betterttv.net/3/cached/emotes/global",
			);

			return data.map(transformBttvEmote);
		},
	};

	protected async fetch7tv() {
		const { emoteSets } = await execute7tvQuery(globalEmoteSetQuery);
		const set = emoteSets.global!;

		return {
			emotes: set.emotes.items.map((item) => transformGql7tvEmote(item.emote, item.alias)),
			version: { setId: set.id, updatedAt: set.updatedAt },
		};
	}

	protected async fetch7tvVersion() {
		const { emoteSets } = await execute7tvQuery(globalEmoteSetVersionQuery);
		const set = emoteSets.global;

		return set ? { setId: set.id, updatedAt: set.updatedAt } : null;
	}
}
