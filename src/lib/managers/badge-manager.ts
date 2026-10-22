import { ofetch } from "ofetch";
import { SvelteMap } from "svelte/reactivity";

import type { BttvBadge, FfzBadge } from "#lib/models/badge.js";

import { app } from "#lib/app.svelte.js";
import * as cache from "#lib/cache.js";
import { ApiError } from "#lib/errors/api-error.js";
import { globalBadgesQuery } from "#lib/graphql/twitch.js";
import { Badge } from "#lib/models/badge.js";

interface BttvUser {
	providerId: string;
	badge: BttvBadge;
}

interface FfzResponse {
	badges: FfzBadge[];
	users: Record<string, number[]>;
}

const FRESH = 60 * 60; // 1 hour
const TTL = 30 * 24 * 60 * 60; // 30 days

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
			const { badges: data } = await app.twitch.gql(globalBadgesQuery);
			badges = data?.flatMap((b) => (b ? [Badge.fromGql(b)] : [])) ?? [];

			// Twitch adds new badges fairly often, so ttl is lower than the
			// global emote cache
			await cache.set("global_badges", badges, 3 * 24 * 60 * 60);
		}

		for (const badge of badges) {
			this.set(badge.id, badge);
		}

		return badges;
	}

	public async fetchBttv(force = false) {
		const response = await cache.revalidate(
			"bttv_badges",
			async () => {
				try {
					return await ofetch<BttvUser[]>("https://api.betterttv.net/3/cached/badges");
				} catch (error) {
					throw ApiError.from(error);
				}
			},
			{
				fresh: FRESH,
				ttl: TTL,
				force,
				onRevalidate: (data) => this.#addBttv(data),
			},
		);

		this.#addBttv(response);
	}

	public async fetchFfz(force = false) {
		const response = await cache.revalidate(
			"ffz_badges",
			async () => {
				try {
					return await ofetch<FfzResponse>("https://api.frankerfacez.com/v1/badges/ids");
				} catch (error) {
					throw ApiError.from(error);
				}
			},
			{
				fresh: FRESH,
				ttl: TTL,
				force,
				onRevalidate: (data) => this.#addFfz(data),
			},
		);

		this.#addFfz(response);
	}

	#addBttv(response: BttvUser[]) {
		for (const user of response) {
			const id = `bttv:${user.badge.type}`;

			const badge = this.getOrInsertComputed(id, () => {
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

	#addFfz(response: FfzResponse) {
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
		const badges = this.users.getOrInsert(id, []);
		const idx = badges.findIndex((b) => b.id === badge.id);

		if (idx === -1) {
			badges.push(badge);
		} else {
			badges[idx] = badge;
		}
	}
}
