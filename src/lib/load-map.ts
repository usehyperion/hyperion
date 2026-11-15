import { latest, once } from "#lib/util/resource.js";

type Entries<K, V> = Iterable<readonly [K, V]>;

export interface LoadContext<K, V> {
	/**
	 * Whether the load was forced, in which case cached data shouldn't be
	 * used.
	 */
	force: boolean;

	/**
	 * Aborted once the map is cleared or reloaded, at which point the load's
	 * result is discarded.
	 */
	signal: AbortSignal;

	/**
	 * Replaces the entries with newer ones loaded in the background, unless
	 * the map has been cleared or reloaded since.
	 */
	update: (entries: Entries<K, V>) => void;
}

/**
 * A map whose entries are loaded together from one source, once until it is
 * cleared or a reload is forced.
 */
export abstract class LoadMap<K, V> extends Map<K, V> {
	readonly #request = latest();
	#force = false;

	readonly #load = once(async () => {
		const force = this.#force;
		this.#force = false;

		const signal = this.#request.next();
		let entries: Entries<K, V>;

		try {
			entries = await this.load({
				force,
				signal,
				update: (entries) => {
					if (!signal.aborted) {
						this.#replace(entries);
					}
				},
			});
		} catch (error) {
			if (signal.aborted) return;
			throw error;
		}

		if (!signal.aborted) {
			this.#replace(entries);
		}
	});

	protected abstract load(context: LoadContext<K, V>): Promise<Entries<K, V>>;

	public override clear() {
		this.#reset();
		super.clear();
	}

	public async fetch(force = false) {
		if (force) {
			this.#force = true;
			this.#reset();
		}

		await this.#load();
		return this;
	}

	#reset() {
		this.#request.abort();
		this.#load.reset();
	}

	#replace(entries: Entries<K, V>) {
		// Not this.clear(), which would forget the load in progress
		super.clear();

		for (const [key, value] of entries) {
			this.set(key, value);
		}
	}
}
