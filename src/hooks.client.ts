import { log } from "#lib/log.js";
import { loadThemes } from "#lib/themes.js";

export async function init() {
	// Themes are optional, so failing to load them mustn't stop the app.
	await loadThemes().catch((error: unknown) => {
		log.error(`Failed to load themes: ${String(error)}`);
	});
}
