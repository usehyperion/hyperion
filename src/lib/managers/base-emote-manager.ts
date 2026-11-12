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
	 * Cached 7TV emotes are replaced once it no longer matches.
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
	 * Whether cached 7TV emotes of the given version can be shown while
	 * they're revalidated, i.e. they aren't known to be of another set.
	 */
	protected isCurrent7tvVersion(_version: string | null) {
		return true;
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

	/**
	 * Returns cached 7TV emotes immediately and checks whether the set has
	 * changed since in the background, replacing them if it has.
	 */
	async #load7tv(force: boolean) {
		const key = this.#key("7TV");
		const entry = force ? null : await cache.get<VersionedEntry>(key);

		if (entry && this.isCurrent7tvVersion(entry.version)) {
			log.debug(`Cache hit for ${key} (version ${entry.version}), revalidating`);

			this.#revalidate7tv(key, entry.version).catch(
				log.swallow(`Failed to revalidate ${key}`, "warn"),
			);

			return entry.data;
		}

		log.debug(`Cache miss for ${key}`);

		const [emotes, version] = await Promise.all([
			this.loaders["7TV"](),
			// undefined means the version couldn't be checked, in which case
			// the emotes aren't cached since they couldn't be revalidated.
			this.fetch7tvVersion().catch(() => undefined),
		]);

		if (version !== undefined) {
			await cache.set(key, { data: emotes, version } satisfies VersionedEntry, TTL);
		}

		return emotes;
	}

	async #revalidate7tv(key: string, cached: string | null) {
		const version = await this.fetch7tvVersion();

		if (version === cached) {
			log.debug(`Cache for ${key} is up to date`);
			return;
		}

		log.debug(`Cache for ${key} is outdated (version ${version}), refetching`);

		const emotes = await this.loaders["7TV"]();
		await cache.set(key, { data: emotes, version } satisfies VersionedEntry, TTL);

		// 7TV may have been disabled or reloaded while revalidating.
		if (this.#loaded.has("7TV")) {
			this.#replace("7TV", emotes);
		}
	}
}
