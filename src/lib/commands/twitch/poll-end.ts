import { CommandError } from "$lib/errors/command-error";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll-end",
	description: "End the active poll in the channel",
	modOnly: true,
	async exec(_, channel) {
		const { poll } = channel.chat;

		if (!poll || poll.status !== "ACTIVE") {
			throw new CommandError("There is no active poll to end.");
		}

		await poll.terminate();
	},
});
