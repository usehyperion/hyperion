import { CommandError } from "$lib/errors/command-error";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "prediction-cancel",
	description: "Cancel the active prediction and refund all points",
	modOnly: true,
	async exec(_, channel) {
		const status = channel.prediction?.status;

		if (status !== "ACTIVE" && status !== "LOCKED") {
			throw new CommandError("There is no active prediction to cancel.");
		}

		await channel.prediction!.cancel();
	},
});
