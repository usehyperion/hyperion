import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, parseBool } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "emote-only",
	description: "Restrict chat to emote only messages",
	modOnly: true,
	args: ["enabled"],
	async exec(args, channel) {
		const enabled = parseBool(args[0]);

		if (enabled === null) {
			throw new CommandError(ErrorMessage.INVALID_BOOL_ARG);
		}

		await channel.chat.updateSettings({ emoteOnly: enabled });
	},
});
