import { CommandError } from "#lib/errors/command-error.js";
import { ErrorMessage } from "#lib/errors/messages.js";

import { command } from "../define";

export default command({
	name: "shoutout",
	description: "Highlight a channel for viewers to follow",
	permission: "mod",
	args: [{ type: "user", name: "channel" }],
	errors: () => ({ OFFLINE_BROADCASTER: ErrorMessage.CHANNEL_MUST_BE_LIVE }),
	async exec({ channel: target }, channel) {
		if (!channel.stream) {
			throw new CommandError(ErrorMessage.CHANNEL_MUST_BE_LIVE);
		}

		if (channel.id === target.id) {
			throw new CommandError(ErrorMessage.CANNOT_TARGET_SELF);
		}

		await channel.shoutout(target.username);
	},
});
