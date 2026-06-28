import type { Menu } from "@tauri-apps/api/menu";
import chroma from "chroma-js";
import type { User } from "./models/user.svelte";
import { Viewer } from "./models/viewer.svelte";
import type { Fragment } from "./twitch/api";
import type { Emote } from "./twitch/irc";

export { cn } from "cnfast";

export type {
	WithElementRef,
	WithoutChild,
	WithoutChildren,
	WithoutChildrenOrChild,
} from "bits-ui";

export type Nullable<T> = { [K in keyof T]: T[K] | null };

export type Prefix<T, P extends string> = {
	[K in keyof T as `${P}_${K & string}`]: T[K];
};

// Only for syntax highlighting
export const html = String.raw;

export function clamp(min: number, value: number, max: number) {
	return Math.min(Math.max(min, value), max);
}

export function formatDuration(seconds: number) {
	if (seconds === 0) return "";

	const parts: string[] = [];

	const days = Math.floor(seconds / 86400);
	if (days) {
		parts.push(`${days}d`);
		seconds %= 86400;
	}

	const hours = Math.floor(seconds / 3600);
	if (hours) {
		parts.push(`${hours}h`);
		seconds %= 3600;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes) {
		parts.push(`${minutes}m`);
		seconds %= 60;
	}

	if (seconds || !parts.length) {
		parts.push(`${seconds}s`);
	}

	return parts.join(" ");
}

export function colorizeName(data: Viewer | User) {
	const color = data instanceof Viewer ? data.user.color : data.color;

	return html`<span class="font-semibold" style="color: ${color};">${data.displayName}</span>`;
}

export function extractEmotes(fragments: Fragment[]): Emote[] {
	const emotes: Emote[] = [];
	let offset = 0;

	for (const fragment of fragments) {
		const length = Array.from(fragment.text).length;

		if (fragment.type === "emote") {
			emotes.push({
				id: fragment.emote.id,
				code: fragment.text,
				range: {
					start: offset,
					end: offset + length,
				},
			});
		}

		offset += length;
	}

	return emotes;
}

const colorCache = new Map<string, string>();

export function makeReadable(foreground: string) {
	if (foreground === "inherit") return foreground;

	const background = getComputedStyle(document.body).backgroundColor;
	const key = `${foreground}:${background}`;

	const seen = colorCache.get(key);
	if (seen) return seen;

	const [l, c, h] = (background.match(/[\d.]+/g) ?? []).map(Number);

	let fg = chroma(foreground);
	const bg = chroma.oklch(l, c, h);
	let contrast = chroma.contrast(fg, bg);

	if (contrast >= 4.5) {
		colorCache.set(key, fg.hex());
		return fg.hex();
	}

	const lighten = bg.luminance() < 0.5;
	let i = 0;

	while (contrast < 4.5 && i < 50) {
		fg = lighten ? fg.brighten(0.1) : fg.darken(0.1);
		contrast = chroma.contrast(fg, bg);
		i++;
	}

	const adjusted = fg.hex();
	colorCache.set(key, adjusted);

	return adjusted;
}

export function debounce<F extends (...args: Parameters<F>) => ReturnType<F>>(
	fn: F,
	timeout: number,
) {
	let id: ReturnType<typeof setTimeout>;

	return (...args: Parameters<F>) => {
		clearTimeout(id);
		id = setTimeout(() => fn(...args), timeout);
	};
}

const requests = new Map<string, Promise<any>>();

export function dedupe<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
	const request = requests.get(key);
	if (request) return request;

	const promise = fetcher().finally(() => {
		requests.delete(key);
	});

	requests.set(key, promise);

	return promise;
}

export function chunk<T>(items: T[], size: number): T[][] {
	const chunks: T[][] = [];

	for (let i = 0; i < items.length; i += size) {
		chunks.push(items.slice(i, i + size));
	}

	return chunks;
}

export async function mapPool<T, R>(
	items: T[],
	limit: number,
	mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results = Array.from<R>({ length: items.length });
	let cursor = 0;

	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (cursor < items.length) {
			const index = cursor++;
			// oxlint-disable-next-line no-await-in-loop -- bounded concurrency pool
			results[index] = await mapper(items[index], index);
		}
	});

	await Promise.all(workers);

	return results;
}

export async function openMenu(event: MouseEvent, menufn: () => Promise<Menu>) {
	event.preventDefault();

	const menu = await menufn();
	await menu.popup();
}

// https://github.com/tc39/proposal-upsert
export function getOrInsert<K, V>(map: Map<K, V>, key: K, defaultValue: V): V {
	if (map.has(key)) {
		return map.get(key)!;
	}

	map.set(key, defaultValue);
	return defaultValue;
}

export function getOrInsertComputed<K, V>(map: Map<K, V>, key: K, defaultValue: () => V): V {
	if (map.has(key)) {
		return map.get(key)!;
	}

	const value = defaultValue();
	map.set(key, value);

	return value;
}
