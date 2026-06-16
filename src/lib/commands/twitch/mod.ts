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
					status: 400,
					includes: "already",
					message: ErrorMessage.USER_ALREADY_MOD(target.displayName),
				},
				{
					status: 400,
					includes: "banned",
					message: ErrorMessage.BANNED_USER_CANNOT_BE_MOD(target.displayName),
				},
				{
					status: 422,
					message: ErrorMessage.VIP_CANNOT_BE_MOD(target.displayName),
				},
			],
		);
	},
});
