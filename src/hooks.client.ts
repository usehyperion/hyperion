import { log } from "#lib/log.js";
import { loadThemes } from "#lib/themes.js";

export async function init() {
	// Themes are optional, so errors shouldn't block the app from starting
	await loadThemes().catch(log.catch("Failed to load themes"));
}
