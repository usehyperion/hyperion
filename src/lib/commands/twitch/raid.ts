import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "raid",
	description: "Send viewers to another channel when the stream ends",
	permission: "mod",
	args: [
		{
			type: "user",
			name: "channel",
		},
	],
	errors: (args) => ({
		CANNOT_RAID_THIS_CHANNEL: `${args.channel.displayName}'s channel settings do not allow raids at this time.`,
		CANNOT_RAID_YOURSELF: CommandError.CANNOT_TARGET_SELF,
		ALREADY_RAIDING: "The channel is already raiding another channel.",
		TOO_MANY_VIEWERS_TO_RAID: "The channel has too many viewers to raid right now.",
	}),
	fallback: (args) => `${args.channel.displayName} cannot be raided.`,
	async exec(args, channel) {
		if (channel.id === args.channel.id) {
			throw new CommandError(CommandError.CANNOT_TARGET_SELF);
		}

		await channel.startRaid(args.channel.id);
	},
});
