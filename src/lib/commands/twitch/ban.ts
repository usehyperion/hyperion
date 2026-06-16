import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "ban",
	description: "Permanently ban a user from chat",
	modOnly: true,
	args: ["username", "reason"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => target.ban(args.slice(1).join(" ")),
			[
				{
					status: 400,
					includes: "already banned",
					message: ErrorMessage.USER_ALREADY_BANNED(target.displayName),
				},
				{
					status: 400,
					includes: "may not be banned",
					message: ErrorMessage.USER_CANNOT_BE_BANNED(target.displayName),
				},
			],
		);
	},
});
