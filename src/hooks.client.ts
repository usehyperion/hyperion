import { stats } from "tauri-plugin-cache-api";
import { log } from "$lib/log";
import { loadThemes } from "$lib/themes";

export async function init() {
	const { totalSize } = await stats();
	log.info(`Cache has ${totalSize} items`);

	await loadThemes();
}
