import { CommandError } from "$lib/errors/command-error";
import { openDialog } from "$lib/util";
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

		openDialog(`poll-dialog-${channel.id}`);
	},
});
