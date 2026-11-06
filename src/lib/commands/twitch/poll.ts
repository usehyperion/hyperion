import { dialogs, openDialog } from "#lib/dialogs.js";
import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "poll",
	description: "Create a poll for the channel",
	permission: "mod",
	exec(_, channel) {
		if (channel.poll?.active) {
			throw new CommandError("A poll is already active.");
		}

		openDialog(dialogs.poll(channel.id));
	},
});
