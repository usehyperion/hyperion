import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider } from "#lib/emotes.js";

import { settings } from "#lib/settings/index.js";

const PROVIDERS = [
	["FrankerFaceZ", "chat.emotes.ffz"],
	["BetterTTV", "chat.emotes.bttv"],
	["7TV", "chat.emotes.seventv"],
] as const;

export type ThirdPartyProvider = (typeof PROVIDERS)[number][0];

export abstract class BaseEmoteManager extends SvelteMap<string, Emote> {
	/**
	 * The providers whose emotes have been loaded successfully.
	 */
	readonly #loaded = new Set<EmoteProvider>();

	public abstract fetchFfz(): Promise<Emote[]>;
	public abstract fetchBttv(): Promise<Emote[]>;
	public abstract fetch7tv(): Promise<Emote[]>;

	/**
	 * Loads the emotes from the providers enabled in the settings that haven't
	 * been loaded yet and removes the emotes from disabled providers.
	 */
	public async fetch(force = false) {
		if (force) this.clear();

		const promises: Promise<void>[] = [];

		for (const [provider, key] of PROVIDERS) {
			if (!settings.state[key]) {
				this.clear(provider);
			} else if (!this.#loaded.has(provider)) {
				promises.push(this.load(provider));
			}
		}

		await Promise.all(promises);
	}

	/**
	 * Replaces the emotes from the specified provider with newly fetched ones.
	 */
	public async load(provider: ThirdPartyProvider) {
		this.clear(provider);

		switch (provider) {
			case "FrankerFaceZ":
				await this.fetchFfz();
				break;
			case "BetterTTV":
				await this.fetchBttv();
				break;
			case "7TV":
				await this.fetch7tv();
				break;
		}

		this.#loaded.add(provider);
	}

	/**
	 * Whether the emotes from the specified provider have been loaded.
	 */
	public isLoaded(provider: EmoteProvider) {
		return this.#loaded.has(provider);
	}

	/**
	 * The providers whose emotes have been loaded.
	 */
	public get providers() {
		return [...this.#loaded];
	}

	/**
	 * Adds emotes that were loaded elsewhere, e.g. in another window, and marks
	 * their providers as loaded.
	 */
	public restore(emotes: Iterable<Emote>, providers: Iterable<EmoteProvider>) {
		this.addAll(emotes);

		for (const provider of providers) {
			this.#loaded.add(provider);
		}
	}

	public addAll(emotes: Iterable<Emote>) {
		for (const emote of emotes) {
			this.set(emote.displayName, emote);
		}

		return this;
	}

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
}
