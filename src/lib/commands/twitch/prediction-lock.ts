import { CommandError } from "$lib/errors/command-error";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "prediction-lock",
	description: "Lock the active prediction in the channel",
	modOnly: true,
	async exec(_, channel) {
		if (!channel.prediction || channel.prediction.status !== "ACTIVE") {
			throw new CommandError("There is no active prediction to lock.");
		}

		await channel.prediction.lock();
	},
});
