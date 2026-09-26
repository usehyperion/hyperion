import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll-end",
	description: "End the active poll in the channel",
	modOnly: true,
	async exec(_, channel) {
		if (!channel.poll || channel.poll.status !== "ACTIVE") {
			throw new CommandError("There is no active poll to end.");
		}

		await mapErrors(() => channel.poll!.end(), [], ErrorMessage.COMMAND_FAILED);
	},
});
