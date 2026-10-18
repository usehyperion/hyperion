import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider } from "#lib/emotes.js";

import * as cache from "#lib/cache.js";
import { settings } from "#lib/settings/index.js";

const FRESH = 5 * 60;

// Only evicts entries for channels that haven't been joined in a while since
// entries are refreshed on every fetch
const TTL = 30 * 24 * 60 * 60;

interface VersionedEntry {
	data: Emote[];
	version: string | null;
}

export abstract class BaseEmoteManager extends SvelteMap<string, Emote> {
	/**
	 * Identifies this manager's entries in the cache.
	 */
	protected abstract get cacheId(): string;

	/**
	 * Retrieves a value that changes whenever the 7TV emote set is modified.
	 */
	protected abstract fetch7tvVersion(): Promise<string | null>;

	public abstract fetchFfz(): Promise<Emote[]>;
	public abstract fetchBttv(): Promise<Emote[]>;
	public abstract fetch7tv(): Promise<Emote[]>;

	/**
	 * Loads the emotes from the providers enabled in the settings. Cached
	 * emotes are used immediately and refreshed in the background if stale.
	 */
	public async fetch(force = false) {
		if (force) this.clear();

		const promises: Promise<void>[] = [];

		if (settings.state["chat.emotes.ffz"]) {
			promises.push(this.#load("FrankerFaceZ", () => this.fetchFfz(), force));
		}

		if (settings.state["chat.emotes.bttv"]) {
			promises.push(this.#load("BetterTTV", () => this.fetchBttv(), force));
		}

		if (settings.state["chat.emotes.seventv"]) {
			promises.push(this.#load7tv(force));
		}

		await Promise.all(promises);
	}

	public addAll(emotes: Iterable<Emote>) {
		for (const emote of emotes) {
			this.set(emote.displayName, emote);
		}

		return this;
	}

	/**
	 * Replaces the emotes from the specified provider, only touching the
	 * entries that changed.
	 */
	public replace(provider: EmoteProvider, emotes: Emote[]) {
		const next = new Map(emotes.map((emote) => [emote.displayName, emote]));

		for (const [name, emote] of this) {
			if (emote.provider === provider && !next.has(name)) {
				this.delete(name);
			}
		}

		for (const [name, emote] of next) {
			if (this.get(name)?.id !== emote.id) {
				this.set(name, emote);
			}
		}
	}

	/**
	 * Removes all emotes from the specified provider or all emotes if no
	 * provider is given.
	 */
	public override clear(provider?: EmoteProvider) {
		if (provider) {
			for (const emote of this.values()) {
				if (emote.provider === provider) this.delete(emote.displayName);
			}
		} else {
			super.clear();
		}
	}

	#key(provider: EmoteProvider) {
		return `emotes:${provider.toLowerCase()}:${this.cacheId}`;
	}

	async #load(provider: EmoteProvider, fetcher: () => Promise<Emote[]>, force: boolean) {
		const emotes = await cache.revalidate(this.#key(provider), fetcher, {
			fresh: FRESH,
			ttl: TTL,
			force,
			onRevalidate: (emotes) => this.replace(provider, emotes),
		});

		this.addAll(emotes);
	}

	async #load7tv(force: boolean) {
		const key = this.#key("7TV");

		const [entry, version] = await Promise.all([
			force ? null : cache.get<VersionedEntry>(key),
			// undefined means the version couldn't be checked, in which case
			// cached emotes are preferred over failing
			this.fetch7tvVersion().catch(() => undefined),
		]);

		if (entry && (version === undefined || entry.version === version)) {
			this.addAll(entry.data);
			return;
		}

		const emotes = await this.fetch7tv();
		this.addAll(emotes);

		if (version !== undefined) {
			await cache.set(key, { data: emotes, version } satisfies VersionedEntry, TTL);
		}
	}
}
