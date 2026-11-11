import { log } from "./log";

export interface PersistedOptions<T> {
	/**
	 * Patches the state after it's been read e.g. to fill in nested
	 * defaults that the shallow merge with the defaults misses.
	 */
	restore?: (state: T) => T;
}

/**
 * State that's kept in `localStorage` and saved whenever it changes.
 */
export class Persisted<T extends object> {
	public state: T;

	readonly #key: string;
	readonly #defaults: T;
	readonly #restore: (state: T) => T;

	public constructor(key: string, defaults: T, options: PersistedOptions<T> = {}) {
		this.#key = key;
		this.#defaults = defaults;
		this.#restore = options.restore ?? ((state) => state);

		this.state = $state(this.#parse(this.#read()));

		$effect.root(() => {
			$effect(() => {
				this.#write(JSON.stringify(this.state));
			});
		});
	}

	// temp for migration
	public replace(saved: unknown) {
		this.state = this.#parse(saved);
		this.save();
	}

	/**
	 * Saves the state right away instead of after the current update.
	 */
	public save() {
		this.#write(JSON.stringify(this.state));
	}

	#read(): unknown {
		try {
			const raw = localStorage.getItem(this.#key);
			return raw === null ? null : JSON.parse(raw);
		} catch (error) {
			log.warn(`Failed to read ${this.#key}, using defaults`, error);
			return null;
		}
	}

	#write(json: string) {
		try {
			localStorage.setItem(this.#key, json);
		} catch (error) {
			log.error(`Failed to save ${this.#key}`, error);
		}
	}

	#parse(saved: unknown): T {
		const state = structuredClone(this.#defaults);

		if (isRecord(saved)) {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion
			for (const key of Object.keys(state) as (keyof T & string)[]) {
				if (Object.hasOwn(saved, key) && sameType(saved[key], state[key])) {
					// oxlint-disable-next-line typescript/no-unsafe-type-assertion
					state[key] = saved[key] as T[typeof key];
				}
			}
		}

		return this.#restore(state);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameType(value: unknown, fallback: unknown) {
	// A null default stands in for an optional object.
	if (fallback === null) {
		return value === null || typeof value === "object";
	}

	if (Array.isArray(fallback)) {
		return Array.isArray(value);
	}

	if (isRecord(fallback)) {
		return isRecord(value);
	}

	return typeof value === typeof fallback;
}
