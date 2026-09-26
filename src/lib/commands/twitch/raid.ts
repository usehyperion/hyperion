import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "raid",
	description: "Send viewers to another channel when the stream ends",
	modOnly: true,
	args: ["channel"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		if (channel.user.id === target.id) {
			throw new CommandError(ErrorMessage.CANNOT_TARGET_SELF);
		}

		await mapErrors(
			() => channel.startRaid(target.id),
			[
				{
					code: "CANNOT_RAID_THIS_CHANNEL",
					message: ErrorMessage.SETTINGS_DO_NOT_ALLOW_RAIDS(target.displayName),
				},
				{
					code: "CANNOT_RAID_YOURSELF",
					message: ErrorMessage.CANNOT_TARGET_SELF,
				},
				{
					code: "ALREADY_RAIDING",
					message: ErrorMessage.ALREADY_RAIDING,
				},
				{
					code: "TOO_MANY_VIEWERS_TO_RAID",
					message: ErrorMessage.TOO_MANY_VIEWERS_TO_RAID,
				},
			],
			ErrorMessage.USER_CANNOT_BE_RAIDED(target.displayName),
		);
	},
});
