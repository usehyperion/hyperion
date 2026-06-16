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
					status: 409,
					message: ErrorMessage.NO_VIP_SLOTS,
				},
				{
					status: 422,
					includes: "already",
					message: ErrorMessage.USER_ALREADY_VIP(target.displayName),
				},
				{
					status: 422,
					includes: "moderator",
					message: ErrorMessage.MOD_CANNOT_BE_VIP(target.displayName),
				},
			],
		);
	},
});
