import { invoke } from "@tauri-apps/api/core";

import { log } from "#lib/log.js";

const VERSION = 1;

interface Entry<T> {
	data: T;
	fetchedAt: number;
}

export interface RevalidateOptions<T> {
	/**
	 * Seconds after a fetch during which the cached data is used without
	 * revalidating.
	 */
	fresh: number;

	/**
	 * Seconds until the entry is evicted if it isn't refetched.
	 */
	ttl?: number;

	/**
	 * Whether to bypass the cache and fetch directly.
	 */
	force?: boolean;

	/**
	 * Called with the refetched data after stale data was returned.
	 */
	onRevalidate: (data: T) => void;
}

/**
 * Returns cached data immediately and refetches it in the background once it's
 * older than `fresh` seconds.
 */
export async function revalidate<T>(
	key: string,
	fetcher: () => Promise<T>,
	options: RevalidateOptions<T>,
) {
	const entry = options.force ? null : await getEntry<T>(key);
	const age = entry ? Math.round((Date.now() - entry.fetchedAt) / 1000) : 0;

	if (entry && age < options.fresh) {
		log.debug(`Cache hit for ${key} (${age}s old)`);
		return entry.data;
	}

	const pending = fetcher().then((data) => {
		// Not awaited since the data doesn't depend on being written.
		set(key, { data, fetchedAt: Date.now() } satisfies Entry<T>, options.ttl);
		return data;
	});

	if (!entry) {
		log.debug(`Cache miss for ${key}`);
		return pending;
	}

	log.debug(`Cache stale for ${key} (${age}s old), revalidating`);

	pending
		.then(options.onRevalidate)
		.catch((error) => log.warn(`Failed to revalidate ${key}`, error));

	return entry.data;
}

function versioned(key: string) {
	return `v${VERSION}:${key}`;
}

async function getEntry<T>(key: string) {
	const entry = await get<Entry<T>>(key);

	// Entries written in an older format are treated as missing.
	return entry && typeof entry.fetchedAt === "number" && "data" in entry ? entry : null;
}

export async function get<T>(key: string) {
	try {
		return await invoke<T | null>("cache_get", { key: versioned(key) });
	} catch (error) {
		// A broken entry shouldn't prevent loading from the network.
		log.warn(`Failed to read ${key} from the cache`, error);
		return null;
	}
}

export async function set(key: string, value: unknown, ttl?: number) {
	try {
		await invoke("cache_set", { key: versioned(key), value, ttl });
	} catch (error) {
		log.warn(`Failed to write ${key} to the cache`, error);
	}
}

export async function remove(key: string) {
	await invoke("cache_remove", { key: versioned(key) });
}

export async function clear() {
	await invoke("cache_clear");
}

/**
 * Returns the size of all cached entries in bytes.
 */
export async function size() {
	return invoke<number>("cache_size");
}
