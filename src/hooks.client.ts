import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";

import { log } from "#lib/log.js";
import { loadThemes } from "#lib/themes.js";

dayjs.extend(duration);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);

export async function init() {
	// Themes are optional, so errors shouldn't block the app from starting
	await loadThemes().catch(log.swallow("Failed to load themes"));
}
