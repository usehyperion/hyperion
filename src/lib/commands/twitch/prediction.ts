import { dialogs, openDialog } from "#lib/dialogs.js";
import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "prediction",
	description: "Create a prediction for the channel",
	permission: "mod",
	exec(_, channel) {
		if (channel.prediction?.open) {
			throw new CommandError("A prediction is already active.");
		}

		openDialog(dialogs.prediction(channel.id));
	},
});
