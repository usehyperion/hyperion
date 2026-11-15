import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "prediction-cancel",
	description: "Cancel the active prediction and refund all points",
	permission: "mod",
	errors: () => ({ EVENT_ENDED: "The prediction has already ended." }),
	async exec(_, channel) {
		if (!channel.prediction?.open) {
			throw new CommandError("There is no active prediction to cancel.");
		}

		await channel.prediction.cancel();
	},
});
