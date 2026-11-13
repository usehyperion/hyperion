import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider, ThirdPartyProvider } from "#lib/emotes.js";

import * as cache from "#lib/cache.js";
import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings.js";

const FRESH = 5 * 60; // 5 minutes
const TTL = 30 * 24 * 60 * 60; // 30 days

export interface SetVersion {
	setId: string;
	updatedAt: string;
}

export interface Versioned7tvEmotes {
	emotes: Emote[];
	version: SetVersion | null;
}

export abstract class BaseEmoteManager extends SvelteMap<string, Emote> {
	protected abstract readonly loaders: Record<
		Exclude<ThirdPartyProvider, "7TV">,
		() => Promise<Emote[]>
	>;

	/**
	 * Identifies this manager's entries in the cache.
	 */
	protected abstract readonly cacheId: string;

	readonly #loaded = new Set<EmoteProvider>();
	readonly #generations = new Map<EmoteProvider, number>();

	/**
	 * Retrieves the 7TV emotes along with the version of their set from the
	 * same response.
	 */
	protected abstract fetch7tv(): Promise<Versioned7tvEmotes>;

	/**
	 * Retrieves only the version of the 7TV set, to check whether cached
	 * emotes are outdated.
	 */
	protected abstract fetch7tvVersion(): Promise<SetVersion | null>;

	/**
	 * Removes all emotes from the specified provider or all emotes if no
	 * provider is given.
	 */
	public override clear(provider?: EmoteProvider) {
		if (provider) {
			this.#bump(provider);
			this.#loaded.delete(provider);

			for (const emote of this.values()) {
				if (emote.provider === provider) {
					this.delete(emote.displayName);
				}
			}
		} else {
			for (const { id } of THIRD_PARTY_PROVIDERS) {
				this.#bump(id);
			}

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
	 * Whether cached 7TV emotes from the given set can be shown while they're
	 * revalidated, i.e. it isn't known to have been replaced by another set.
	 */
	protected isCurrent7tvSet(_setId: string | null) {
		return true;
	}

	/**
	 * Replaces the emotes from the specified provider, reusing cached ones
	 * unless `force` is set.
	 */
	protected async load(provider: ThirdPartyProvider, force = false) {
		const generation = this.#bump(provider);

		// Applies emotes unless the provider has been cleared or loaded again
		// since, e.g. by a reload or a 7TV set change.
		const apply = (emotes: Emote[]) => {
			if (this.#generations.get(provider) !== generation) {
				return false;
			}

			this.#replace(provider, emotes);
			return true;
		};

		const emotes =
			provider === "7TV"
				? await this.#load7tv(force, apply)
				: await cache.revalidate(this.#key(provider), this.loaders[provider], {
						fresh: FRESH,
						ttl: TTL,
						force,
						onRevalidate: apply,
					});

		if (apply(emotes)) {
			this.#loaded.add(provider);
		}
	}

	#bump(provider: EmoteProvider) {
		const generation = this.#generations.getOrInsert(provider, 0) + 1;
		this.#generations.set(provider, generation);

		return generation;
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
	 * changed since in the background, applying the new emotes if it has.
	 */
	async #load7tv(force: boolean, apply: (emotes: Emote[]) => void) {
		const key = this.#key("7TV");
		const entry = force ? null : await cache.get<Versioned7tvEmotes>(key);

		if (entry && this.isCurrent7tvSet(entry.version?.setId ?? null)) {
			log.debug(`Cache hit for ${key}, revalidating`);

			this.#revalidate7tv(key, entry.version, apply).catch(
				log.swallow(`Failed to revalidate ${key}`, "warn"),
			);

			return entry.emotes;
		}

		log.debug(`Cache miss for ${key}`);

		const fetched = await this.fetch7tv();
		cache.set(key, fetched, TTL);

		return fetched.emotes;
	}

	async #revalidate7tv(key: string, cached: SetVersion | null, apply: (emotes: Emote[]) => void) {
		const version = await this.fetch7tvVersion();

		if (version?.setId === cached?.setId && version?.updatedAt === cached?.updatedAt) {
			log.debug(`Cache for ${key} is up to date`);
			return;
		}

		log.debug(`Cache for ${key} is outdated, refetching`);

		const fetched = await this.fetch7tv();
		cache.set(key, fetched, TTL);

		apply(fetched.emotes);
	}
}
