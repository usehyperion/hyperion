import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "hide-prediction",
	description: "Hide the prediction in chat",
	async exec(_, channel) {
		if (channel.prediction) {
			channel.prediction.hidden = true;
		}
	},
});
