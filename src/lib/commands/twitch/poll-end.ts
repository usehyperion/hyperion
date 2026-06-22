import { CommandError } from "$lib/errors/command-error";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll-end",
	description: "End the active poll in the channel",
	modOnly: true,
	async exec(_, channel) {
		if (!channel.poll || channel.poll.status !== "ACTIVE") {
			throw new CommandError("There is no active poll to end.");
		}

		await channel.poll.end();
	},
});
