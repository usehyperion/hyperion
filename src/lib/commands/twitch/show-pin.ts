import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "show-pin",
	description: "Show the pinned message in chat",
	async exec(_, channel) {
		if (channel.chat.pinned) {
			channel.chat.pinned.hidden = false;
		}
	},
});
