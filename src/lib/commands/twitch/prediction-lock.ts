import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "prediction-lock",
	description: "Lock the active prediction in the channel",
	permission: "mod",
	errors: () => ({ EVENT_NOT_ACTIVE: "The prediction is no longer active." }),
	async exec(_, channel) {
		// Only a prediction still taking predictions can be locked.
		if (channel.prediction?.status !== "ACTIVE") {
			throw new CommandError("There is no active prediction to lock.");
		}

		await channel.prediction.lock();
	},
});
