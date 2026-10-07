import { loadThemes } from "#lib/themes.js";

export async function init() {
	await loadThemes();
}
