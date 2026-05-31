import { settings } from "$lib/settings";
import { injectTheme, loadThemes } from "$lib/themes";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-theme",
	description: "Reload the current custom theme to apply any changes.",
	async exec(_, channel) {
		await loadThemes(settings.state["appearance.theme"]);
		await injectTheme(settings.state["appearance.theme"]);

		channel.chat.notice("Reloaded theme.");
	},
});
