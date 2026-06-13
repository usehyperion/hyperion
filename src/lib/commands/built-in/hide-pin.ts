import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "hide-pin",
	description: "Hide the pinned message in chat",
	async exec(_, channel) {
		if (channel.chat.pinned) {
			channel.chat.pinned.hidden = true;
		}
	},
});
