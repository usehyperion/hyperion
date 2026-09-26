import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unmod",
	description: "Revoke moderator status from a user",
	broadcasterOnly: true,
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => channel.viewers.unmod(target.id),
			[
				{
					code: "TARGET_NOT_MOD",
					message: ErrorMessage.USER_NOT_MOD(target.displayName),
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
