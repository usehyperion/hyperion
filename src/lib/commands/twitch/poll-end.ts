import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "poll-end",
	description: "End the active poll in the channel",
	permission: "mod",
	async exec(_, channel) {
		if (!channel.poll?.active) {
			throw new CommandError("There is no active poll to end.");
		}

		await channel.poll.end();
	},
});
