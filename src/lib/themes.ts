import { convertFileSrc } from "@tauri-apps/api/core";
import { appConfigDir, join } from "@tauri-apps/api/path";
import * as fs from "@tauri-apps/plugin-fs";
import * as v from "valibot";

import { app } from "./app.svelte";
import { log } from "./log";

const MANIFEST_FILE = "manifest.json";
const STYLESHEET_FILE = "main.css";

const ID_REGEX = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/i;

// There shouldn't be a reason why a manifest would be this large
const MAX_MANIFEST_SIZE = 64 * 1024;

// Seems unlikely that a user would want to install more than this many themes
const MAX_THEMES = 64;

const MAX_LENGTH = {
	name: 64,
	description: 256,
	author: 64,
	version: 32,
	repository: 2048,
} as const;

const IdSchema = v.pipe(v.string(), v.regex(ID_REGEX));

const RepositorySchema = v.pipe(
	v.string(),
	v.trim(),
	v.maxLength(MAX_LENGTH.repository),
	v.url(),
	v.transform((value) => new URL(value)),
	v.check((url) => url.protocol === "https:" || url.protocol === "http:"),
	v.transform((url) => url.toString()),
);

const ManifestSchema = v.object({
	name: displayText(MAX_LENGTH.name),
	description: v.fallback(displayText(MAX_LENGTH.description), ""),
	author: v.fallback(displayText(MAX_LENGTH.author), "Unknown"),
	version: v.fallback(displayText(MAX_LENGTH.version), "0.0.0"),
	repository: v.fallback(v.optional(RepositorySchema), undefined),
});

export type ThemeManifest = v.InferOutput<typeof ManifestSchema>;

export interface Theme extends ThemeManifest {
	id: string;
	path: string;
}

function isThemeId(id: string) {
	return v.safeParse(IdSchema, id).success;
}

function displayText(max: number) {
	return v.pipe(
		v.string(),
		v.transform((value) =>
			value
				.replace(/[\p{Cc}\p{Cf}]/gu, "")
				.trim()
				.slice(0, max),
		),
		v.nonEmpty(),
	);
}

let themesDir: Promise<string> | undefined;

async function loadThemesDir() {
	const dir = await join(await appConfigDir(), "themes");

	if (!(await fs.exists(dir))) {
		await fs.mkdir(dir, { recursive: true });
	}

	return dir;
}

export function getThemesDir() {
	// Cache the promise rather than the value so concurrent callers share one
	// mkdir instead of racing each other.
	themesDir ??= loadThemesDir().catch((error) => {
		themesDir = undefined;

		throw error;
	});

	return themesDir;
}

async function inspect(path: string) {
	const info = await fs.lstat(path);

	if (!info.isFile) {
		throw new Error(info.isSymlink ? `${path} is a symlink` : `${path} is not a regular file`);
	}

	return info;
}

async function readTheme(dir: string, id: string): Promise<Theme | undefined> {
	if (!isThemeId(id)) {
		log.warn(`Skipping theme folder with unsupported name: ${id}`);
		return undefined;
	}

	const path = await join(dir, id);
	const manifestPath = await join(path, MANIFEST_FILE);
	const info = await inspect(manifestPath);

	if (info.size > MAX_MANIFEST_SIZE) {
		log.warn(`Skipping theme "${id}": ${MANIFEST_FILE} exceeds ${MAX_MANIFEST_SIZE} bytes`);
		return undefined;
	}

	let source: unknown;

	try {
		source = JSON.parse(await fs.readTextFile(manifestPath));
	} catch {
		log.warn(`Skipping theme "${id}": ${MANIFEST_FILE} is not valid JSON`);
		return undefined;
	}

	const manifest = v.safeParse(ManifestSchema, source);

	if (!manifest.success) {
		log.warn(`Skipping theme "${id}": ${v.summarize(manifest.issues).replaceAll("\n", " ")}`);
		return undefined;
	}

	// Resolved up front so a theme that cannot render never reaches the list.
	await inspect(await join(path, STYLESHEET_FILE));

	// id and path come last so a manifest field can never shadow them.
	return { ...manifest.output, id, path };
}

export async function loadThemes(id?: string) {
	if (id !== undefined && !isThemeId(id)) {
		log.warn(`Refusing to load theme with unsupported id "${id}"`);
		return;
	}

	const dir = await getThemesDir();
	const entries = await fs.readDir(dir);

	// readDir reports a symlinked folder as neither file nor directory, so this
	// also drops folders that link elsewhere on disk.
	const candidates = entries.filter((entry) => entry.isDirectory && (!id || entry.name === id));

	if (candidates.length > MAX_THEMES) {
		log.warn(`Found ${candidates.length} theme folders, only loading the first ${MAX_THEMES}`);
		candidates.length = MAX_THEMES;
	}

	const loaded = await Promise.all(
		candidates.map(async (entry) => {
			try {
				return await readTheme(dir, entry.name);
			} catch (error) {
				log.warn(`Skipping invalid theme folder "${entry.name}": ${String(error)}`);
				return undefined;
			}
		}),
	);

	if (id) {
		app.themes.delete(id);
	} else {
		app.themes.clear();
	}

	for (const theme of loaded) {
		if (!theme) continue;

		app.themes.set(theme.id, theme);
		log.trace(`Loaded theme "${theme.id}" (${theme.name} v${theme.version})`);
	}

	const sorted = [...app.themes.values()].toSorted((a, b) => a.name.localeCompare(b.name));

	app.themes.clear();

	for (const theme of sorted) {
		app.themes.set(theme.id, theme);
	}

	log.info(`Loaded ${app.themes.size} themes`);
}

// Identifies the most recent injectTheme call so a slower one cannot overwrite
// a newer selection when their path lookups interleave.
let generation = 0;

// Used for cache invalidation.
let revision = Date.now();

function clearTheme(link: HTMLLinkElement) {
	link.removeAttribute("href");
	link.dataset.themeId = "";
}

export async function injectTheme(id: string, force = false) {
	const element = document.getElementById("hyperion-custom-theme");

	if (!(element instanceof HTMLLinkElement)) {
		log.error("Theme <link /> element not found");
		return;
	}

	const token = ++generation;

	if (!id) {
		clearTheme(element);
		return;
	}

	if (!isThemeId(id)) {
		log.warn(`Refusing to apply theme with unsupported id "${id}"`);
		clearTheme(element);
		return;
	}

	const theme = app.themes.get(id);

	if (!theme) {
		log.warn(`Theme with id "${id}" not found`);
		clearTheme(element);
		return;
	}

	if (!force && element.dataset.themeId === id) return;

	const href = convertFileSrc(await join(theme.path, STYLESHEET_FILE));

	// A newer call landed while the path was resolving, so leave its result be.
	if (token !== generation) return;

	// Bypass the webview stylesheet cache.
	element.href = `${href}?v=${++revision}`;
	element.dataset.themeId = id;
}

/**
 * Reloads every theme from disk and re-applies the selected one.
 */
export async function reloadThemes(id: string) {
	await loadThemes();
	await injectTheme(id, true);
}
