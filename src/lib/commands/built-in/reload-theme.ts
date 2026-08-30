import { settings } from "$lib/settings";
import { reloadThemes } from "$lib/themes";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-theme",
	description: "Reload the current custom theme to apply any changes.",
	async exec(_, channel) {
		await reloadThemes(settings.state["appearance.theme"]);

		channel.chat.notice("Reloaded theme.");
	},
});
