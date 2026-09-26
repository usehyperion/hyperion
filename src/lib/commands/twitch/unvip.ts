import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unvip",
	description: "Revoke VIP status from a user",
	broadcasterOnly: true,
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => channel.viewers.unvip(target.id),
			[
				{
					code: "REVOKEE_NOT_VIP",
					message: ErrorMessage.USER_NOT_VIP(target.displayName),
				},
				{
					code: "REVOKEE_NOT_FOUND",
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
