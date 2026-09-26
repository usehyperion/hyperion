import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, mapErrors } from "../util";

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

		await mapErrors(
			() => channel.prediction!.cancel(),
			[
				{
					code: "EVENT_ENDED",
					message: ErrorMessage.PREDICTION_ENDED,
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
