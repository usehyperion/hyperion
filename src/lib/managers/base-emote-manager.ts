import { SvelteMap } from "svelte/reactivity";

import type { Emote, EmoteProvider, ThirdPartyProvider } from "#lib/emotes.js";

import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
import { log } from "#lib/log.js";
import { settings } from "#lib/settings/index.js";

export abstract class BaseEmoteManager extends SvelteMap<string, Emote> {
	readonly #loaded = new Set<EmoteProvider>();

	protected abstract readonly loaders: Record<ThirdPartyProvider, () => Promise<Emote[]>>;

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
					await this.load(id);
				} catch (error) {
					log.warn(`Failed to load ${id} emotes: ${String(error)}`);
				}
			}),
		);
	}

	/**
	 * Replaces the emotes from the specified provider with newly fetched ones.
	 */
	protected async load(provider: ThirdPartyProvider) {
		const emotes = await this.loaders[provider]();

		this.clear(provider);

		for (const emote of emotes) {
			this.set(emote.displayName, emote);
		}

		this.#loaded.add(provider);
	}

	public isLoaded(provider: EmoteProvider) {
		return this.#loaded.has(provider);
	}
}
