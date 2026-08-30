import { goto } from "$app/navigation";
import { resolve } from "$app/paths";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "leave",
	description: "Leave the current channel",
	async exec(_, channel) {
		await channel.leave();
		await goto(resolve("/"));
	},
});
