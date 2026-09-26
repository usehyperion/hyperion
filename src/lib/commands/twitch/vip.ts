import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "vip",
	description: "Grant VIP status to a user",
	broadcasterOnly: true,
	args: ["username"],
	async exec(args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => channel.viewers.vip(target.id),
			[
				{
					code: "GRANTEE_ALREADY_VIP",
					message: ErrorMessage.USER_ALREADY_VIP(target.displayName),
				},
				{
					code: "MAX_VIPS_REACHED",
					message: ErrorMessage.NO_VIP_SLOTS,
				},
				{
					code: "GRANTEE_CHAT_BANNED",
					message: ErrorMessage.BANNED_USER_CANNOT_BE_VIP(target.displayName),
				},
				{
					code: "GRANTEE_NOT_FOUND",
					message: ErrorMessage.USER_NOT_FOUND(target.username),
				},
				{
					code: "VIP_ACHIEVEMENT_INCOMPLETE",
					message: ErrorMessage.VIP_ACHIEVEMENT_INCOMPLETE,
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
