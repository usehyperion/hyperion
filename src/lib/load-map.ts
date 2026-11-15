import { once } from "#lib/util/resource.js";

type Entries<K, V> = Iterable<readonly [K, V]>;

export interface LoadContext<K, V> {
	/**
	 * Whether the load was forced, in which case cached data shouldn't be
	 * used.
	 */
	force: boolean;

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
	#force = false;
	#controller = new AbortController();

	readonly #load = once(async () => {
		const force = this.#force;
		this.#force = false;

		const { signal } = this.#controller;

		const entries = await this.load({
			force,
			update: (entries) => {
				if (!signal.aborted) {
					this.#replace(entries);
				}
			},
		});

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
		this.#controller.abort();
		this.#controller = new AbortController();
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
