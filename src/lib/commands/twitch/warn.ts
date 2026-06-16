import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "warn",
	description:
		"Issue a warning to a user that they must acknowledge before sending more messages",
	modOnly: true,
	args: ["username", "reason"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);
		const reason = args.slice(1).join(" ");

		if (!reason) {
			throw new CommandError(ErrorMessage.MISSING_ARG(this.args[1]));
		}

		await mapErrors(
			() => target.warn(reason),
			[
				{
					includes: "may not be warned",
					message: ErrorMessage.USER_CANNOT_BE_WARNED(target.displayName),
				},
			],
		);
	},
});
