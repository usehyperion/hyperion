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
			[{ status: 422, message: ErrorMessage.USER_NOT_MOD(target.displayName) }],
		);
	},
});
