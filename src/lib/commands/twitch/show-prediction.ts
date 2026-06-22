import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "show-prediction",
	description: "Show the prediction in chat",
	async exec(_, channel) {
		if (channel.prediction) {
			channel.prediction.hidden = false;
		}
	},
});
