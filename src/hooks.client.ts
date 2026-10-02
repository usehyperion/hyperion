import { stats } from "tauri-plugin-cache-api";

import { log } from "#lib/log.js";
import { loadThemes } from "#lib/themes.js";

export async function init() {
	const { totalSize } = await stats();
	log.info(`Cache has ${totalSize} items`);

	await loadThemes();
}
