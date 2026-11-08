import type { Component } from "svelte";

import SevenTvIcon from "~icons/logos/7tv";
import BttvIcon from "~icons/logos/bttv";
import FfzIcon from "~icons/logos/ffz";
import TwitchIcon from "~icons/logos/twitch";

import type { Emote as SevenTvEmote } from "./graphql/7tv";
import type { User } from "./models/user.svelte";
import type { Settings } from "./settings";
import type { EmoteChange } from "./seventv";

import stv from "../assets/logos/7tv.svg";
import bttv from "../assets/logos/bttv.svg";
import ffz from "../assets/logos/ffz.svg";
import { BADGE_SETS } from "./models/badge";
import { sevenTvFileUrl } from "./seventv";

export type EmoteProvider = "Twitch" | "FrankerFaceZ" | "BetterTTV" | "7TV";

export interface Emote {
	readonly provider: EmoteProvider;

	readonly id: string;

	/**
	 * The canonical name of the emote as given by its provider.
	 */
	readonly name: string;

	/**
	 * The channel-specific name the emote has been renamed to if any.
	 * 7TV only.
	 */
	alias?: string;

	/**
	 * The name the emote is shown and typed as i.e. its alias if it has one
	 * and its canonical name otherwise.
	 */
	displayName: string;

	readonly width: number;

	readonly height: number;

	/**
	 * The width the emote occupies inline in chat.
	 */
	readonly displayWidth: number;

	/**
	 * The height the emote occupies inline in chat.
	 */
	readonly displayHeight: number;

	/**
	 * Image candidates as `<url> <density>x`. Which densities exist and their
	 * order depend on the provider.
	 */
	readonly srcset: string[];

	/**
	 * Whether the emote is zero-width i.e. can be used to modify other emotes.
	 * 7TV only.
	 */
	readonly zeroWidth?: boolean;
}

export interface EmoteSet {
	readonly id: string;

	readonly provider: EmoteProvider;

	readonly name: string;

	readonly owner: Pick<User, "id" | "displayName" | "avatarUrl">;

	readonly emotes: Emote[];

	/**
	 * Whether the emote set can be used in any channel.
	 */
	readonly global?: boolean;
}

export const PROVIDER_ICONS: Record<EmoteProvider, Component> = {
	Twitch: TwitchIcon,
	"7TV": SevenTvIcon,
	BetterTTV: BttvIcon,
	FrankerFaceZ: FfzIcon,
};

/**
 * The providers whose emotes are loaded per channel and globally, in the
 * order they're shown, along with the settings that enable their emotes and
 * badges and how their global set is shown.
 */
export const THIRD_PARTY_PROVIDERS = [
	{
		id: "7TV",
		badgeSetId: BADGE_SETS.seventv,
		emotesSetting: "chat.emotes.seventv",
		badgesSetting: "chat.badges.seventv",
		global: {
			name: "Global: 7TV",
			owner: { id: "7tv_global", displayName: "7TV Global", avatarUrl: stv },
		},
	},
	{
		id: "BetterTTV",
		badgeSetId: BADGE_SETS.bttv,
		emotesSetting: "chat.emotes.bttv",
		badgesSetting: "chat.badges.bttv",
		global: {
			name: "Global: BetterTTV",
			owner: { id: "bttv_global", displayName: "BetterTTV Global", avatarUrl: bttv },
		},
	},
	{
		id: "FrankerFaceZ",
		badgeSetId: BADGE_SETS.ffz,
		emotesSetting: "chat.emotes.ffz",
		badgesSetting: "chat.badges.ffz",
		global: {
			name: "Global: FrankerFaceZ",
			owner: { id: "ffz_global", displayName: "FrankerFaceZ Global", avatarUrl: ffz },
		},
	},
] as const satisfies readonly {
	id: EmoteProvider;
	badgeSetId: string;
	emotesSetting: keyof Settings;
	badgesSetting: keyof Settings;
	global: Pick<EmoteSet, "name" | "owner">;
}[];

type ThirdPartyProviderInfo = (typeof THIRD_PARTY_PROVIDERS)[number];

export type ThirdPartyProvider = ThirdPartyProviderInfo["id"];

export function toProviderSets(
	emotes: Iterable<Emote>,
	meta: (provider: ThirdPartyProviderInfo) => Omit<EmoteSet, "provider" | "emotes">,
): EmoteSet[] {
	const groups = Map.groupBy(emotes, (emote) => emote.provider);
	const sets: EmoteSet[] = [];

	for (const provider of THIRD_PARTY_PROVIDERS) {
		const group = groups.get(provider.id);
		if (!group?.length) continue;

		sets.push({ ...meta(provider), provider: provider.id, emotes: group });
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

/**
 * Splits an emote's {@linkcode Emote.srcset} into its candidate urls and the
 * pixel densities they're for, e.g. `{ url: "…", density: "2x" }`.
 */
export function emoteSources(emote: Pick<Emote, "srcset">) {
	return emote.srcset.map((candidate) => {
		const [url, density] = candidate.split(" ");
		return { url, density };
	});
}

export function transformTwitchEmote(id: string, name: string): Emote {
	return {
		provider: "Twitch",
		id,
		name,
		displayName: name,
		width: 56,
		height: 56,
		// Twitch serves emotes at 28px for 1.0.
		displayWidth: 28,
		displayHeight: 28,
		srcset: [1, 2, 3].map(
			(density) =>
				`https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/${density}.0 ${density}x`,
		),
	};
}

export function transformFfzEmote(emote: FfzEmote): Emote {
	return {
		provider: "FrankerFaceZ",
		id: emote.id.toString(),
		name: emote.name,
		displayName: emote.name,
		width: emote.width,
		height: emote.height,
		displayWidth: emote.width,
		displayHeight: emote.height,
		srcset: Object.entries(emote.urls).map(([n, url]) => `${url} ${n}x`),
	};
}

export function transformBttvEmote(emote: BttvEmote): Emote {
	const width = emote.width ?? 28;
	const height = emote.height ?? 28;

	return {
		provider: "BetterTTV",
		id: emote.id,
		name: emote.code,
		displayName: emote.code,
		width,
		height,
		displayWidth: width,
		displayHeight: height,
		srcset: [1, 2, 3].map((n) => `https://cdn.betterttv.net/emote/${emote.id}/${n}x ${n}x`),
	};
}

interface SevenTvImage {
	url: string;
	format: string;
	width: number;
	height: number;
	scale: number;
}

/**
 * Builds a 7TV emote from its animated images. 7TV's GraphQL API and its
 * event API describe the same images in different shapes, so callers
 * normalize them first.
 */
export function transform7tvEmote(
	emote: { id: string; name: string; alias?: string; zeroWidth: boolean },
	images: SevenTvImage[],
): Emote {
	const format = ["webp", "gif", "png"].find((f) => images.some((img) => img.format === f));

	const candidates = images
		.filter((img) => img.format === format)
		.toSorted((a, b) => b.width - a.width);

	const largest = candidates.at(0);
	const scale = largest?.scale || 1;
	const alias = emote.alias && emote.alias !== emote.name ? emote.alias : undefined;

	return {
		provider: "7TV",
		id: emote.id,
		name: emote.name,
		alias,
		displayName: alias ?? emote.name,
		width: largest?.width ?? 28,
		height: largest?.height ?? 28,
		displayWidth: (largest?.width ?? 28) / scale,
		displayHeight: (largest?.height ?? 28) / scale,
		srcset: candidates.map((img) => `${img.url} ${img.scale}x`),
		zeroWidth: emote.zeroWidth,
	};
}

export function transformGql7tvEmote(emote: SevenTvEmote, alias?: string): Emote {
	return transform7tvEmote(
		{ id: emote.id, name: emote.defaultName, alias, zeroWidth: emote.flags.defaultZeroWidth },
		emote.images
			.filter((img) => !img.url.includes("static"))
			.map((img) => ({
				url: img.url,
				format: img.mime.split("/").at(-1) ?? "",
				width: img.width,
				height: img.height,
				scale: img.scale,
			})),
	);
}

// 7TV's emote flag for zero-width emotes.
const ZERO_WIDTH_FLAG = 256;

/**
 * Builds a 7TV emote from the event API.
 */
export function transformEvent7tvEmote(emote: EmoteChange): Emote {
	const { host } = emote.data;

	return transform7tvEmote(
		{
			id: emote.id,
			name: emote.data.name,
			alias: emote.name,
			zeroWidth: (emote.data.flags & ZERO_WIDTH_FLAG) === ZERO_WIDTH_FLAG,
		},
		host.files.map((file) => ({
			url: sevenTvFileUrl(host, file),
			format: file.format.toLowerCase(),
			width: file.width,
			height: file.height,
			// Files are named by their scale, e.g. "2x.webp".
			scale: Number(file.name[0]) || 1,
		})),
	);
}
