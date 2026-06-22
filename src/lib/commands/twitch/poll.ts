import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll",
	description: "Create a poll for the channel",
	modOnly: true,
	async exec(_, channel) {
		channel.chat.pollDialogOpen = true;
	},
});
