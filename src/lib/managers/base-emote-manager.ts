import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider, ThirdPartyProvider } from "#lib/emotes.js";

import * as cache from "#lib/cache.js";
import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings.js";

/**
 * Seconds after a fetch during which cached FFZ and BTTV emotes are used
 * without revalidating.
 */
const FRESH = 5 * 60;

/**
 * Seconds until a cached entry is evicted. Entries are refreshed on every
 * fetch, so this only evicts channels that haven't been joined in a while.
 */
const TTL = 30 * 24 * 60 * 60;

interface VersionedEntry {
	data: Emote[];
	version: string | null;
}

export abstract class BaseEmoteManager extends SvelteMap<string, Emote> {
	protected abstract readonly loaders: Record<ThirdPartyProvider, () => Promise<Emote[]>>;

	/**
	 * Identifies this manager's entries in the cache.
	 */
	protected abstract readonly cacheId: string;

	readonly #loaded = new Set<EmoteProvider>();

	/**
	 * Retrieves a value that changes whenever the 7TV emote set is modified.
	 * 7TV emotes are only reused from the cache while it matches.
	 */
	protected abstract fetch7tvVersion(): Promise<string | null>;

	/**
	 * Removes all emotes from the specified provider or all emotes if no
	 * provider is given.
	 */
	public override clear(provider?: EmoteProvider) {
		if (provider) {
			this.#loaded.delete(provider);

			for (const emote of this.values()) {
				if (emote.provider === provider) this.delete(emote.displayName);
			}
		} else {
			this.#loaded.clear();
			super.clear();
		}
	}

	public isLoaded(provider: EmoteProvider) {
		return this.#loaded.has(provider);
	}

	/**
	 * Loads the emotes from the providers enabled in the settings that haven't
	 * been loaded yet and removes the emotes from disabled providers. A
	 * provider that fails to load is skipped and retried on the next call.
	 *
	 * Cached emotes are used immediately and refreshed in the background if
	 * stale. Forcing a fetch bypasses the cache.
	 */
	public async fetch(force = false) {
		if (force) this.clear();

		await Promise.all(
			THIRD_PARTY_PROVIDERS.map(async ({ id, emotesSetting }) => {
				if (!settings.state[emotesSetting]) {
					this.clear(id);
					return;
				}

				if (this.#loaded.has(id)) return;

				try {
					await this.load(id, force);
				} catch (error) {
					log.warn(`Failed to load ${id} emotes`, error);
				}
			}),
		);
	}

	/**
	 * Replaces the emotes from the specified provider, reusing cached ones
	 * unless `force` is set.
	 */
	protected async load(provider: ThirdPartyProvider, force = false) {
		const emotes =
			provider === "7TV"
				? await this.#load7tv(force)
				: await cache.revalidate(this.#key(provider), this.loaders[provider], {
						fresh: FRESH,
						ttl: TTL,
						force,
						onRevalidate: (emotes) => {
							// The provider may have been disabled or reloaded
							// while revalidating.
							if (this.#loaded.has(provider)) this.#replace(provider, emotes);
						},
					});

		this.#replace(provider, emotes);
		this.#loaded.add(provider);
	}

	#key(provider: ThirdPartyProvider) {
		return `emotes:${provider.toLowerCase()}:${this.cacheId}`;
	}

	/**
	 * Replaces the emotes from the specified provider, only touching the
	 * entries that changed.
	 */
	#replace(provider: ThirdPartyProvider, emotes: Emote[]) {
		const next = new Map(emotes.map((emote) => [emote.displayName, emote]));

		for (const [name, emote] of this) {
			if (emote.provider === provider && !next.has(name)) {
				this.delete(name);
			}
		}

		for (const [name, emote] of next) {
			const current = this.get(name);

			if (current?.id !== emote.id || current.provider !== emote.provider) {
				this.set(name, emote);
			}
		}
	}

	async #load7tv(force: boolean) {
		const key = this.#key("7TV");

		const [entry, version] = await Promise.all([
			force ? null : cache.get<VersionedEntry>(key),
			// undefined means the version couldn't be checked, in which case
			// cached emotes are preferred over failing.
			this.fetch7tvVersion().catch(() => undefined),
		]);

		if (entry && (version === undefined || entry.version === version)) {
			void log.debug(`Cache hit for ${key} (version ${entry.version})`);
			return entry.data;
		}

		void log.debug(`Cache miss for ${key}`);

		const emotes = await this.loaders["7TV"]();

		if (version !== undefined) {
			await cache.set(key, { data: emotes, version } satisfies VersionedEntry, TTL);
		}

		return emotes;
	}
}
