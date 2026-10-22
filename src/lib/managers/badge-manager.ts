import { ofetch } from "ofetch";
import { SvelteMap } from "svelte/reactivity";

import type { BttvBadge, FfzBadge } from "#lib/models/badge.js";

import { app } from "#lib/app.svelte.js";
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

export class BadgeManager extends SvelteMap<string, Badge> {
	/**
	 * A map of user ids to provider-specific badges.
	 */
	public readonly users = new SvelteMap<string, Badge[]>();

	public async fetch() {
		await Promise.all([this.fetchTwitch(), this.fetchBttv(), this.fetchFfz()]);
	}

	/**
	 * Retrieves the list of global badges.
	 */
	public async fetchTwitch() {
		const { badges: data } = await app.twitch.gql(globalBadgesQuery);
		const badges = data?.flatMap((b) => (b ? [Badge.fromGql(b)] : [])) ?? [];

		for (const badge of badges) {
			this.set(badge.id, badge);
		}

		return badges;
	}

	public async fetchBttv() {
		let response: BttvUser[];

		try {
			response = await ofetch<BttvUser[]>("https://api.betterttv.net/3/cached/badges");
		} catch (error) {
			throw ApiError.from(error);
		}

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

	public async fetchFfz() {
		let response: FfzResponse;

		try {
			response = await ofetch<FfzResponse>("https://api.frankerfacez.com/v1/badges/ids");
		} catch (error) {
			throw ApiError.from(error);
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
		const badges = this.users.getOrInsert(id, []);
		const idx = badges.findIndex((b) => b.id === badge.id);

		if (idx === -1) {
			badges.push(badge);
		} else {
			badges[idx] = badge;
		}
	}
}
