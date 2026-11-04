import { measure } from "#lib/perf.js";
import { loadThemes } from "#lib/themes.js";

export async function init() {
	await measure("startup:themes", loadThemes);
}
