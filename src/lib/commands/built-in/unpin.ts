import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "unpin",
	description: "Unpin the currently pinned message in the channel",
	modOnly: true,
	async exec(_, channel) {
		await channel.chat.unpin();
	},
});
