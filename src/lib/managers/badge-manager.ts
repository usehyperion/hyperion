import { SvelteMap } from "svelte/reactivity";

import type { BttvBadge, FfzBadge } from "#lib/models/badge.js";
import type { TwitchClient } from "#lib/twitch/client.js";

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

export const BADGE_PROVIDERS = ["twitch", "bttv", "ffz"] as const;

export type BadgeProvider = (typeof BADGE_PROVIDERS)[number];

export class BadgeManager extends SvelteMap<string, Badge> {
	/**
	 * The badges third-party providers give to each user keyed by user id.
	 */
	public readonly users = new SvelteMap<string, Badge[]>();

	readonly #loads: Record<BadgeProvider, Once<void>> = {
		twitch: once(async () => {
			const { badges } = await this.client.gql(globalBadgesQuery);

			for (const data of badges ?? []) {
				if (!data) continue;

				const badge = Badge.fromGql(data);
				this.set(badge.id, badge);
			}
		}),
		bttv: once(async () => {
			const users = await fetchJson<BttvUser[]>("https://api.betterttv.net/3/cached/badges");

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
		}),
		ffz: once(async () => {
			const data = await fetchJson<FfzResponse>("https://api.frankerfacez.com/v1/badges/ids");
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
		}),
	};

	public constructor(public readonly client: TwitchClient) {
		super();
	}

	public override clear() {
		for (const load of Object.values(this.#loads)) {
			load.reset();
		}

		this.users.clear();
		super.clear();
	}

	/**
	 * Retrieves the global badges of the given providers once until cleared or
	 * a reload is forced.
	 */
	public async fetch(providers: readonly BadgeProvider[] = BADGE_PROVIDERS, force = false) {
		await Promise.all(
			providers.map(async (provider) => {
				const load = this.#loads[provider];
				if (force) load.reset();

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
}
