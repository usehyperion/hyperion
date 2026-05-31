import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-cheermotes",
	description: "Reload cheermotes for the channel",
	async exec(_, channel) {
		await channel.fetchCheermotes(true);

		channel.chat.notice("Reloaded cheermotes.");
	},
});
