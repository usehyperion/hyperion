import { once } from "#lib/util/resource.js";

/**
 * A map whose entries are loaded together from one source, once until it is
 * cleared or a reload is forced.
 */
export abstract class LoadMap<K, V> extends Map<K, V> {
	readonly #load = once(async () => {
		const entries = await this.load();

		// Not this.clear(), which would forget the load in progress
		super.clear();

		for (const [key, value] of entries) {
			this.set(key, value);
		}
	});

	protected abstract load(): Promise<Iterable<readonly [K, V]>>;

	public override clear() {
		this.#load.reset();
		super.clear();
	}

	public async fetch(force = false) {
		if (force) {
			this.#load.reset();
		}

		await this.#load();
		return this;
	}
}
