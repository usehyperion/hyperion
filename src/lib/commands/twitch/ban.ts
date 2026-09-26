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
					code: "TARGET_ALREADY_BANNED",
					message: ErrorMessage.USER_ALREADY_BANNED(target.displayName),
				},
				{
					code: "TARGET_NOT_FOUND",
					message: ErrorMessage.USER_NOT_FOUND(target.username),
				},
			],
			ErrorMessage.USER_CANNOT_BE_BANNED(target.displayName),
		);
	},
});
