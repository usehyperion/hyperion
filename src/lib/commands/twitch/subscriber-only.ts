import { CommandError } from "#lib/errors/command-error.js";
import { ErrorMessage } from "#lib/errors/messages.js";

import { defineCommand, parseBool } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "subscriber-only",
	description: "Restrict chat to subscribers only",
	modOnly: true,
	args: ["enabled"],
	async exec(args, channel) {
		const enabled = parseBool(args[0]);

		if (enabled === null) {
			throw new CommandError(ErrorMessage.INVALID_BOOL_ARG);
		}

		await channel.chat.updateSettings({ subOnly: enabled });
	},
});
