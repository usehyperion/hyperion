import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "show-poll",
	description: "Show the poll in chat",
	async exec(_, channel) {
		if (channel.poll) {
			channel.poll.hidden = false;
		}
	},
});
