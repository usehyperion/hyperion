import { loadThemes } from "#lib/themes.js";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-theme",
	description: "Reload the current custom theme to apply any changes.",
	async exec(_, channel) {
		await loadThemes();

		channel.chat.notice("Reloaded theme.");
	},
});
