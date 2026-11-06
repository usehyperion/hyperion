import { dialogs, openDialog } from "#lib/dialog.js";
import { CommandError } from "#lib/errors/command-error.js";

import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll",
	description: "Create a poll for the channel",
	modOnly: true,
	async exec(_, channel) {
		if (channel.poll?.status === "ACTIVE") {
			throw new CommandError("A poll is already active.");
		}

		openDialog(dialogs.poll(channel.id));
	},
});
