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
			() => channel.raid(target.id),
			[
				{
					status: 400,
					includes: "settings do not",
					message: ErrorMessage.SETTINGS_DO_NOT_ALLOW_RAIDS(target.displayName),
				},
				{
					status: 400,
					includes: "cannot be",
					message: ErrorMessage.USER_CANNOT_BE_RAIDED(target.displayName),
				},
			],
		);
	},
});
