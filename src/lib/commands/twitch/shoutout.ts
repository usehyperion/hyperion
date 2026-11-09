import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "shoutout",
	description: "Highlight a channel for viewers to follow",
	permission: "mod",
	args: [
		{
			type: "user",
			name: "channel",
		},
	],
	errors: () => ({ OFFLINE_BROADCASTER: CommandError.CHANNEL_MUST_BE_LIVE }),
	async exec(args, channel) {
		if (!channel.stream) {
			throw new CommandError(CommandError.CHANNEL_MUST_BE_LIVE);
		}

		if (channel.id === args.channel.id) {
			throw new CommandError(CommandError.CANNOT_TARGET_SELF);
		}

		await channel.shoutout(args.channel.username);
	},
});
