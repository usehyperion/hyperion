import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider, ThirdPartyProvider } from "#lib/emotes.js";

import * as cache from "#lib/cache.js";
import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings.js";
import { latest, type Latest } from "#lib/util/resource.js";
import { MINUTE } from "#lib/util/time.js";

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
		(signal: AbortSignal) => Promise<Emote[]>
	>;

	/**
	 * Identifies this manager's entries in the cache.
	 */
	protected abstract readonly cacheId: string;

	readonly #loaded = new Set<EmoteProvider>();
	readonly #requests = new Map<EmoteProvider, Latest>();

	/**
	 * Retrieves the 7TV emotes along with the version of their set from the
	 * same response.
	 */
	protected abstract fetch7tv(signal?: AbortSignal): Promise<Versioned7tvEmotes>;

	/**
	 * Retrieves only the version of the 7TV set, to check whether cached
	 * emotes are outdated.
	 */
	protected abstract fetch7tvVersion(signal?: AbortSignal): Promise<SetVersion | null>;

	/**
	 * Removes all emotes from the specified provider or all emotes if no
	 * provider is given.
	 */
	public override clear(provider?: EmoteProvider) {
		if (provider) {
			this.#abort(provider);
			this.#loaded.delete(provider);

			for (const emote of this.values()) {
				if (emote.provider === provider) {
					this.delete(emote.displayName);
				}
			}
		} else {
			for (const { id } of THIRD_PARTY_PROVIDERS) {
				this.#abort(id);
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
		const signal = this.#request(provider).next();

		// Applies emotes unless the provider has been cleared or loaded again
		// since, e.g. by a reload or a 7TV set change.
		const apply = (emotes: Emote[]) => {
			if (signal.aborted) {
				return false;
			}

			this.#replace(provider, emotes);
			return true;
		};

		let emotes: Emote[];

		try {
			emotes =
				provider === "7TV"
					? await this.#load7tv(force, signal, apply)
					: await cache.revalidate(
							this.#key(provider),
							() => this.loaders[provider](signal),
							{
								fresh: 5 * MINUTE,
								force,
								signal,
								onRevalidate: apply,
							},
						);
		} catch (error) {
			if (signal.aborted) return;
			throw error;
		}

		if (apply(emotes)) {
			this.#loaded.add(provider);
		}
	}

	#abort(provider: EmoteProvider) {
		this.#requests.get(provider)?.abort();
	}

	#request(provider: EmoteProvider) {
		return this.#requests.getOrInsertComputed(provider, latest);
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
	async #load7tv(force: boolean, signal: AbortSignal, apply: (emotes: Emote[]) => void) {
		const key = this.#key("7TV");
		const entry = force ? null : await cache.get<Versioned7tvEmotes>(key);

		if (entry && this.isCurrent7tvSet(entry.version?.setId ?? null)) {
			log.debug(`Cache hit for ${key}, revalidating`);

			this.#revalidate7tv(key, entry.version, signal, apply).catch((error) => {
				if (!signal.aborted) {
					log.warn(`Failed to revalidate ${key}`, error);
				}
			});

			return entry.emotes;
		}

		log.debug(`Cache miss for ${key}`);

		const fetched = await this.fetch7tv(signal);
		cache.set(key, fetched);

		return fetched.emotes;
	}

	async #revalidate7tv(
		key: string,
		cached: SetVersion | null,
		signal: AbortSignal,
		apply: (emotes: Emote[]) => void,
	) {
		const version = await this.fetch7tvVersion(signal);

		if (version?.setId === cached?.setId && version?.updatedAt === cached?.updatedAt) {
			log.debug(`Cache for ${key} is up to date`);
			return;
		}

		log.debug(`Cache for ${key} is outdated, refetching`);

		const fetched = await this.fetch7tv(signal);
		cache.set(key, fetched);

		apply(fetched.emotes);
	}
}
