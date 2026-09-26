import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "mod",
	description: "Grant moderator status to a user",
	broadcasterOnly: true,
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => channel.viewers.mod(target.id),
			[
				{
					code: "TARGET_ALREADY_MOD",
					message: ErrorMessage.USER_ALREADY_MOD(target.displayName),
				},
				{
					code: "TARGET_IS_CHAT_BANNED",
					message: ErrorMessage.BANNED_USER_CANNOT_BE_MOD(target.displayName),
				},
				{
					code: "TARGET_NOT_FOUND",
					message: ErrorMessage.USER_NOT_FOUND(target.username),
				},
				{
					code: "FORBIDDEN",
					message: ErrorMessage.NO_PERMISSION,
				},
			],
			ErrorMessage.COMMAND_FAILED,
		);
	},
});
