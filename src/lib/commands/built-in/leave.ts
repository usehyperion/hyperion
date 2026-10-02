import { goto } from "$app/navigation";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "leave",
	description: "Leave the current channel",
	async exec(_, channel) {
		await channel.leave();
		await goto("/");
	},
});
