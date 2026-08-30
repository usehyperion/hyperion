import { openDialog } from "$lib/components/ui/Dialog.svelte";
import { CommandError } from "$lib/errors/command-error";

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
