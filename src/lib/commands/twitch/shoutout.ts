import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "shoutout",
	description: "Highlight a channel for viewers to follow",
	modOnly: true,
	args: ["channel"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		if (!channel.stream) {
			throw new CommandError(ErrorMessage.CHANNEL_MUST_BE_LIVE);
		}

		if (channel.user.id === target.id) {
			throw new CommandError(ErrorMessage.CANNOT_TARGET_SELF);
		}

		await channel.shoutout(target.id);
	},
});
