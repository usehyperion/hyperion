import { ApiError } from "$lib/errors/api-error";
import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, getTarget } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "unban",
	description: "Remove a permanent ban on a user",
	modOnly: true,
	args: ["username"],
	async exec(this: void, args, channel) {
		const target = await getTarget(args[0], channel);

		try {
			await channel.viewers.unban(target.id);
		} catch (error) {
			if (error instanceof ApiError && error.status === 400) {
				throw new CommandError(ErrorMessage.USER_NOT_BANNED(target.displayName));
			} else {
				throw error;
			}
		}
	},
});
