import type { Menu } from "@tauri-apps/api/menu";
import chroma from "chroma-js";
import { createSubscriber } from "svelte/reactivity";

export type { WithElementRef, WithoutChildren, WithoutChildrenOrChild } from "bits-ui";

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

	if (seconds) {
		parts.push(`${seconds}s`);
	}

	return parts.join(" ");
}

const colorCache = new Map<string, string>();

const subscribeBackground = createSubscriber((update) => {
	const observer = new MutationObserver(update);

	observer.observe(document.documentElement, {
		attributeFilter: ["class", "style"],
	});

	return () => observer.disconnect();
});

export function makeReadable(foreground: string) {
	if (foreground === "inherit") return foreground;

	subscribeBackground();

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

export interface Once<T> {
	(): Promise<T>;

	/**
	 * Forgets the result so the next call loads again.
	 */
	reset(): void;
}

export function once<T>(load: () => Promise<T>): Once<T> {
	let pending: Promise<T> | null = null;

	const run = () => {
		if (pending) return pending;

		const current = load().catch((error: unknown) => {
			if (pending === current) pending = null;
			throw error;
		});

		pending = current;

		return current;
	};

	return Object.assign(run, {
		reset() {
			pending = null;
		},
	});
}

export function shared<T>(fn: () => Promise<T>): () => Promise<T> {
	let pending: Promise<T> | null = null;

	return () => {
		if (pending) return pending;

		const current = fn().finally(() => {
			if (pending === current) pending = null;
		});

		pending = current;

		return current;
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

export async function openMenu(event: MouseEvent, menufn: () => Promise<Menu>) {
	event.preventDefault();

	const menu = await menufn();
	await menu.popup();
}
