import stv from "../assets/logos/7tv.svg";
import bttv from "../assets/logos/bttv.svg";
import ffz from "../assets/logos/ffz.svg";
import type { Emote as SevenTvEmote } from "./graphql/7tv";
import type { User } from "./models/user.svelte";

export type EmoteProvider = "Twitch" | "FrankerFaceZ" | "BetterTTV" | "7TV";

export interface Emote {
	/**
	 * Which provider the emote is from.
	 */
	readonly provider: EmoteProvider;

	/**
	 * The id of the emote.
	 */
	readonly id: string;

	/**
	 * The name of the emote.
	 */
	name: string;

	/**
	 * The width of the emote.
	 */
	readonly width: number;

	/**
	 * The height of the emote.
	 */
	readonly height: number;

	/**
	 * The candidate urls to use at 1x, 2x, 3x, and optionally 4x pixel
	 * densities.
	 */
	readonly srcset: string[];

	/**
	 * Whether the emote is zero-width i.e. can be used to modify other emotes.
	 * 7TV only.
	 */
	readonly zeroWidth?: boolean;
}

export interface EmoteSet {
	/**
	 * The id of the emote set.
	 */
	readonly id: string;

	/**
	 * The provider the set's emotes belong to.
	 */
	readonly provider: EmoteProvider;

	/**
	 * The name of the emote set.
	 */
	readonly name: string;

	/**
	 * The owner of the emote set.
	 */
	readonly owner: Pick<User, "id" | "displayName" | "avatarUrl">;

	/**
	 * The emotes in the emote set.
	 */
	readonly emotes: Emote[];

	/**
	 * Whether the emote set can be used in any channel.
	 */
	readonly global?: boolean;
}

export const GLOBAL_PROVIDERS = {
	FrankerFaceZ: {
		name: "Global: FrankerFaceZ",
		owner: {
			id: "ffz_global",
			displayName: "FrankerFaceZ Global",
			avatarUrl: ffz,
		},
	},
	BetterTTV: {
		name: "Global: BetterTTV",
		owner: {
			id: "bttv_global",
			displayName: "BetterTTV Global",
			avatarUrl: bttv,
		},
	},
	"7TV": {
		name: "Global: 7TV",
		owner: {
			id: "7tv_global",
			displayName: "7TV Global",
			avatarUrl: stv,
		},
	},
};

export const PROVIDER_DISPLAY_ORDER: readonly EmoteProvider[] = [
	"7TV",
	"BetterTTV",
	"FrankerFaceZ",
];

function groupByProvider(emotes: Iterable<Emote>): Map<EmoteProvider, Emote[]> {
	const groups = new Map<EmoteProvider, Emote[]>();

	for (const emote of emotes) {
		const group = groups.get(emote.provider);

		if (group) {
			group.push(emote);
		} else {
			groups.set(emote.provider, [emote]);
		}
	}

	return groups;
}

export function toProviderSets(
	emotes: Iterable<Emote>,
	meta: (
		provider: EmoteProvider,
		emotes: Emote[],
	) => Omit<EmoteSet, "provider" | "emotes"> | null,
): EmoteSet[] {
	const groups = groupByProvider(emotes);
	const sets: EmoteSet[] = [];

	for (const provider of PROVIDER_DISPLAY_ORDER) {
		const group = groups.get(provider);
		if (!group?.length) continue;

		const info = meta(provider, group);
		if (!info) continue;

		sets.push({ ...info, provider, emotes: group });
	}

	return sets;
}

export interface FfzEmote {
	id: number;
	name: string;
	height: number;
	width: number;
	urls: Record<number, string>;
}

export interface FfzEmoteSet {
	emoticons: FfzEmote[];
}

export interface GlobalSet {
	sets: Record<number, FfzEmoteSet>;
}

export interface BttvEmote {
	id: string;
	code: string;
	width?: number;
	height?: number;
}

export function transformFfzEmote(emote: FfzEmote): Emote {
	return {
		provider: "FrankerFaceZ",
		id: emote.id.toString(),
		name: emote.name,
		width: emote.width,
		height: emote.height,
		srcset: Object.entries(emote.urls).map(([n, url]) => `${url} ${n}x`),
	};
}

export function transformBttvEmote(emote: BttvEmote): Emote {
	return {
		provider: "BetterTTV",
		id: emote.id,
		name: emote.code,
		width: emote.width ?? 28,
		height: emote.height ?? 28,
		srcset: [1, 2, 3].map((n) => `https://cdn.betterttv.net/emote/${emote.id}/${n}x ${n}x`),
	};
}

export function transform7tvEmote(emote: SevenTvEmote, alias?: string): Emote {
	const animated = emote.images.filter((img) => !img.url.includes("static"));

	const format = ["webp", "gif", "png"].find((f) => animated.some((img) => img.mime.endsWith(f)));

	const images = animated
		.filter((img) => img.mime.endsWith(format ?? ""))
		.toSorted((a, b) => b.width - a.width);

	const largest = images.at(0);

	return {
		provider: "7TV",
		id: emote.id,
		name: alias ?? emote.defaultName,
		width: largest?.width ?? 28,
		height: largest?.height ?? 28,
		srcset: images.map((img) => `${img.url} ${img.scale}x`),
		zeroWidth: emote.flags.defaultZeroWidth,
	};
}
