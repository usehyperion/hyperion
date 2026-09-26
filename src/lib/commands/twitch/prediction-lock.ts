import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "prediction-lock",
	description: "Lock the active prediction in the channel",
	modOnly: true,
	async exec(_, channel) {
		if (!channel.prediction || channel.prediction.status !== "ACTIVE") {
			throw new CommandError("There is no active prediction to lock.");
		}

		await mapErrors(
			() => channel.prediction!.lock(),
			[
				{
					code: "EVENT_NOT_ACTIVE",
					message: ErrorMessage.PREDICTION_NOT_ACTIVE,
				},
				{
					code: "FORBIDDEN",
					message: ErrorMessage.NO_PERMISSION,
				},
			],
			ErrorMessage.COMMAND_FAILED,
		);
	},
});
