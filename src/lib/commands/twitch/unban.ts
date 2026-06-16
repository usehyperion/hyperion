import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, getTarget, mapErrors } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unban",
	description: "Remove a permanent ban on a user",
	modOnly: true,
	args: ["username"],
	async exec(this: void, args, channel) {
		const target = await getTarget(args[0], channel);

		await mapErrors(
			() => channel.viewers.unban(target.id),
			[{ status: 400, message: ErrorMessage.USER_NOT_BANNED(target.displayName) }],
		);
	},
});
