import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "hide-poll",
	description: "Hide the poll in chat",
	async exec(_, channel) {
		if (channel.poll) {
			channel.poll.hidden = true;
		}
	},
});
