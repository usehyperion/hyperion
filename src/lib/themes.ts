import { convertFileSrc } from "@tauri-apps/api/core";
import { appConfigDir, join } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/plugin-fs";

import { app } from "./app.svelte";
import { log } from "./log";

export interface ThemeManifest {
	version: string;
	name: string;
	description: string;
	author: string;
	repository?: string;
}

export interface Theme extends ThemeManifest {
	id: string;
	path: string;
}

let themePath: string | undefined;

export async function getThemesDir() {
	if (themePath) return themePath;

	themePath = await join(await appConfigDir(), "themes");
	const exists = await fs.exists(themePath);

	if (!exists) {
		await fs.mkdir(themePath, { recursive: true });
	}

	return themePath;
}

export async function loadThemes(id?: string) {
	if (id) {
		app.themes.delete(id);
	} else {
		app.themes.clear();
	}

	const themesDir = await getThemesDir();
	const entries = await fs.readDir(themesDir);

	for (const entry of entries) {
		if (!entry.isDirectory || (id && entry.name !== id)) continue;

		try {
			const manifestPath = await join(themesDir, entry.name, "manifest.json");

			const content = await fs.readTextFile(manifestPath);
			const manifest: ThemeManifest = JSON.parse(content);

			app.themes.set(entry.name, {
				id: entry.name,
				path: await join(themesDir, entry.name),
				...manifest,
			});

			log.trace(`Loaded theme: ${JSON.stringify(manifest)}`);
		} catch {
			log.warn(`Skipping invalid theme folder: ${entry.name}`);
		}
	}

	log.info(`Loaded ${app.themes.size} themes`);
}

export async function injectTheme(id: string) {
	const link = document.getElementById("hyperion-custom-theme") as HTMLLinkElement | null;

	if (!link) {
		log.error("Theme <link /> element not found");
		return;
	}

	if (!id) {
		link.href = "";
		link.dataset.themeId = "";

		return;
	}

	if (id === link.dataset.themeId) {
		return;
	}

	const theme = app.themes.get(id);

	if (!theme) {
		log.warn(`Theme with id "${id}" not found`);
		return;
	}

	const cssPath = await join(theme.path, "main.css");

	// Bypass cache with timestamp query parameter
	link.href = `${convertFileSrc(cssPath)}?t=${Date.now()}`;
	link.dataset.themeId = id;
}
