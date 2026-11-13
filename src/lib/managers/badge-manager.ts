import { SvelteMap } from "svelte/reactivity";

import type { BttvBadge, FfzBadge } from "#lib/models/badge.js";
import type { TwitchClient } from "#lib/twitch/client.js";

import * as cache from "#lib/cache.js";
import { globalBadgesQuery } from "#lib/graphql/twitch.js";
import { fetchJson } from "#lib/http.js";
import { log } from "#lib/log.js";
import { BADGE_SETS, Badge } from "#lib/models/badge.js";
import { once, type Once } from "#lib/util/resource.js";

interface BttvUser {
	providerId: string;
	badge: BttvBadge;
}

interface FfzResponse {
	badges: FfzBadge[];
	users: Record<string, number[]>;
}

const FFZ_BOT_BADGE = 2;

const FRESH = 60 * 60; // 1 hour
const TTL = 30 * 24 * 60 * 60; // 30 days

export const BADGE_PROVIDERS = ["twitch", "bttv", "ffz"] as const;

export type BadgeProvider = (typeof BADGE_PROVIDERS)[number];

export class BadgeManager extends SvelteMap<string, Badge> {
	/**
	 * The badges third-party providers give to each user keyed by user id.
	 */
	public readonly users = new SvelteMap<string, Badge[]>();

	/**
	 * Providers whose next load should bypass the cache.
	 */
	readonly #forced = new Set<BadgeProvider>();

	readonly #loads: Record<BadgeProvider, Once<void>> = {
		twitch: this.#cached(
			"twitch",
			async () => {
				const { badges } = await this.client.gql(globalBadgesQuery);
				return (badges ?? []).filter((data) => data != null);
			},
			(badges) => {
				for (const data of badges) {
					const badge = Badge.fromGql(data);
					this.set(badge.id, badge);
				}
			},
		),
		bttv: this.#cached(
			"bttv",
			() => fetchJson<BttvUser[]>("https://api.betterttv.net/3/cached/badges"),
			(users) => {
				for (const user of users) {
					const badge = this.getOrInsertComputed(
						Badge.key(BADGE_SETS.bttv, user.badge.type.toString()),
						() =>
							new Badge({
								setId: BADGE_SETS.bttv,
								version: user.badge.type.toString(),
								title: user.badge.description,
								description: user.badge.description,
								imageUrl: user.badge.svg,
							}),
					);

					this.give(user.providerId, badge);
				}
			},
		),
		ffz: this.#cached(
			"ffz",
			() => fetchJson<FfzResponse>("https://api.frankerfacez.com/v1/badges/ids"),
			(data) => {
				const badges = new Map<string, Badge>();

				for (const info of data.badges) {
					// Twitch already has a bot badge so we don't need the FFZ one
					if (info.id === FFZ_BOT_BADGE) continue;

					const badge = new Badge({
						setId: BADGE_SETS.ffz,
						version: info.id.toString(),
						title: info.title,
						description: info.title,
						color: info.color,
						imageUrl: info.urls["4"],
					});

					badges.set(badge.version, badge);
					this.set(badge.id, badge);
				}

				for (const [version, users] of Object.entries(data.users)) {
					const badge = badges.get(version);
					if (!badge) continue;

					for (const id of users) {
						this.give(id.toString(), badge);
					}
				}
			},
		),
	};

	readonly #generations: Record<BadgeProvider, number> = {
		twitch: 0,
		bttv: 0,
		ffz: 0,
	};

	public constructor(public readonly client: TwitchClient) {
		super();
	}

	public override clear() {
		for (const provider of BADGE_PROVIDERS) {
			this.#generations[provider]++;
			this.#loads[provider].reset();
		}

		this.users.clear();
		super.clear();
	}

	/**
	 * Retrieves the global badges of the given providers once until cleared or
	 * a reload is forced. Cached badges are used immediately and refreshed in
	 * the background if stale.
	 */
	public async fetch(providers: readonly BadgeProvider[] = BADGE_PROVIDERS, force = false) {
		await Promise.all(
			providers.map(async (provider) => {
				const load = this.#loads[provider];

				if (force) {
					this.#forced.add(provider);
					this.#generations[provider]++;
					load.reset();
				}

				try {
					await load();
				} catch (error) {
					log.warn(`Failed to load ${provider} badges`, error);
				}
			}),
		);
	}

	/**
	 * Gives a provider badge to a user, replacing an older copy of it.
	 */
	public give(userId: string, badge: Badge) {
		const badges = this.users.getOrInsert(userId, []);
		const index = badges.findIndex((b) => b.id === badge.id);

		if (index === -1) {
			badges.push(badge);
		} else {
			badges[index] = badge;
		}
	}

	/**
	 * Loads a provider's badges from the cache if possible and applies them,
	 * reapplying newer ones once they've been revalidated.
	 */
	#cached<T>(provider: BadgeProvider, fetcher: () => Promise<T>, apply: (data: T) => void) {
		return once(async () => {
			const force = this.#forced.delete(provider);
			const generation = this.#generations[provider];

			const superseded = () => this.#generations[provider] !== generation;

			const data = await cache.revalidate(`badges:${provider}:global`, fetcher, {
				fresh: FRESH,
				ttl: TTL,
				force,
				onRevalidate: (data) => {
					if (!superseded()) apply(data);
				},
			});

			if (!superseded()) apply(data);
		});
	}
}
