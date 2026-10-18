import { invoke } from "@tauri-apps/api/core";

import { log } from "#lib/log.js";

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
	const entry = options.force ? null : await get<Entry<T>>(key);

	if (entry && Date.now() - entry.fetchedAt < options.fresh * 1000) {
		return entry.data;
	}

	const pending = fetcher().then(async (data) => {
		await set(key, { data, fetchedAt: Date.now() } satisfies Entry<T>, options.ttl);
		return data;
	});

	if (!entry) return pending;

	pending
		.then(options.onRevalidate)
		.catch((error) => log.warn(`Failed to revalidate ${key}: ${error}`));

	return entry.data;
}

export async function get<T>(key: string) {
	return invoke<T | null>("cache_get", { key });
}

export async function set(key: string, value: unknown, ttl?: number) {
	await invoke("cache_set", { key, value, ttl });
}

export async function remove(key: string) {
	await invoke("cache_remove", { key });
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
