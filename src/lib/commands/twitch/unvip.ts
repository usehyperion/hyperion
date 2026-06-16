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
			[{ status: 422, message: ErrorMessage.USER_NOT_VIP(target.displayName) }],
		);
	},
});
