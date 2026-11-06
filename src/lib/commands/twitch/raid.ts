import { CommandError } from "#lib/errors/command-error.js";
import { ErrorMessage } from "#lib/errors/messages.js";

import { command } from "../define";

export default command({
	name: "raid",
	description: "Send viewers to another channel when the stream ends",
	permission: "mod",
	args: [{ type: "user", name: "channel" }],
	errors: ({ channel }) => ({
		CANNOT_RAID_THIS_CHANNEL: `${channel.displayName}'s channel settings do not allow raids at this time.`,
		CANNOT_RAID_YOURSELF: ErrorMessage.CANNOT_TARGET_SELF,
		ALREADY_RAIDING: "The channel is already raiding another channel.",
		TOO_MANY_VIEWERS_TO_RAID: "The channel has too many viewers to raid right now.",
	}),
	fallback: ({ channel }) => `${channel.displayName} cannot be raided.`,
	async exec({ channel: target }, channel) {
		if (channel.id === target.id) {
			throw new CommandError(ErrorMessage.CANNOT_TARGET_SELF);
		}

		await channel.startRaid(target.id);
	},
});
