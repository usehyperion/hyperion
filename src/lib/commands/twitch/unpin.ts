import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "unpin",
	description: "Unpin the currently pinned message in the channel",
	permission: "mod",
	async exec(_, channel) {
		await channel.chat.fetchPinned();

		if (!channel.chat.pinned) {
			throw new CommandError("There is no pinned message to unpin.");
		}

		await channel.chat.pinned.unpin();
	},
});
