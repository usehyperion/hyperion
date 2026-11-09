import { loadThemes } from "#lib/themes.js";

import { command } from "../define";

export default command({
	name: "reload-theme",
	description: "Reload the current custom theme to apply any changes.",
	async exec(_, channel) {
		await loadThemes();

		channel.chat.notice("Reloaded theme.");
	},
});
