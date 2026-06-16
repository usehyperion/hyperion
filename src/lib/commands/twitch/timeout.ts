import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, getTarget, mapErrors, parseDuration } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "timeout",
	description: "Temporarily restrict a user from sending messages",
	modOnly: true,
	args: ["username", "duration", "reason"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);
		const duration = parseDuration(args[1]) ?? 600;

		if (duration < 0 || duration > 1_209_600) {
			throw new CommandError(ErrorMessage.INVALID_TIMEOUT_DURATION);
		}

		await mapErrors(
			() => target.timeout({ duration, reason: args.slice(2).join(" ") }),
			[
				{
					includes: "may not be banned",
					message: ErrorMessage.USER_CANNOT_BE_TIMED_OUT(target.displayName),
				},
			],
		);
	},
});
