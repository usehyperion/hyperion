import { ofetch } from "ofetch";
import { SvelteMap } from "svelte/reactivity";
import * as cache from "tauri-plugin-cache-api";
import { ApiError } from "$lib/errors/api-error";
import { sendTwitch } from "$lib/graphql";
import { globalBadgesQuery } from "$lib/graphql/twitch";
import { Badge } from "$lib/models/badge";
import type { BttvBadge, FfzBadge } from "$lib/models/badge";
import { getOrInsert, getOrInsertComputed } from "$lib/util";

interface BttvUser {
	providerId: string;
	badge: BttvBadge;
}

interface FfzResponse {
	badges: FfzBadge[];
	users: Record<string, number[]>;
}

export class BadgeManager extends SvelteMap<string, Badge> {
	/**
	 * A map of user ids to provider-specific badges.
	 */
	public readonly users = new SvelteMap<string, Badge[]>();

	public async fetch(force = false) {
		await Promise.all([this.fetchTwitch(force), this.fetchBttv(force), this.fetchFfz(force)]);
	}

	/**
	 * Retrieves the list of global badges and caches them for later use.
	 */
	public async fetchTwitch(force = false) {
		let badges = await cache.get<Badge[]>("global_badges");

		if (!badges || force) {
			const { badges: data } = await sendTwitch(globalBadgesQuery);
			badges = data?.flatMap((b) => (b ? [Badge.fromGql(b)] : [])) ?? [];

			// Twitch adds new badges fairly often, so ttl is lower than the
			// global emote cache
			await cache.set("global_badges", badges, { ttl: 3 * 24 * 60 * 60 });
		}

		for (const badge of badges) {
			this.set(badge.id, badge);
		}

		return badges;
	}

	public async fetchBttv(force = false) {
		let response = await cache.get<BttvUser[]>("bttv_badges");

		if (!response || force) {
			try {
				response = await ofetch<BttvUser[]>("https://api.betterttv.net/3/cached/badges");
			} catch (error) {
				throw ApiError.from(error);
			}

			await cache.set("bttv_badges", response);
		}

		for (const user of response) {
			const id = `bttv:${user.badge.type}`;

			const badge = getOrInsertComputed(this, id, () => {
				return new Badge({
					setId: "bttv",
					version: user.badge.type.toString(),
					title: user.badge.description,
					description: user.badge.description,
					imageUrl: user.badge.svg,
				});
			});

			this.#insert(user.providerId, badge);
		}
	}

	public async fetchFfz(force = false) {
		let response = await cache.get<FfzResponse>("ffz_badges");

		if (!response || force) {
			try {
				response = await ofetch<FfzResponse>("https://api.frankerfacez.com/v1/badges/ids");
			} catch (error) {
				throw ApiError.from(error);
			}

			await cache.set("ffz_badges", response);
		}

		const badges: Record<string, Badge> = {};

		for (const data of response.badges) {
			if (data.id === 2) continue;

			const version = data.id.toString();

			badges[version] = new Badge({
				setId: "ffz",
				version,
				title: data.title,
				description: data.title,
				color: data.color,
				imageUrl: data.urls["4"],
			});

			this.set(`ffz:${version}`, badges[version]);
		}

		for (const [badgeId, users] of Object.entries(response.users)) {
			if (badgeId === "2") continue;

			const badge = badges[badgeId];

			for (const id of users) {
				this.#insert(id.toString(), badge);
			}
		}
	}

	#insert(id: string, badge: Badge) {
		const badges = getOrInsert(this.users, id, []);
		const idx = badges.findIndex((b) => b.id === badge.id);

		if (idx === -1) {
			badges.push(badge);
		} else {
			badges[idx] = badge;
		}
	}
}
