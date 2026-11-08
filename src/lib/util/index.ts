import type { Menu } from "@tauri-apps/api/menu";

export type { WithElementRef, WithoutChildren, WithoutChildrenOrChild } from "bits-ui";

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
