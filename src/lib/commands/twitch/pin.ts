import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "pin",
	description: "Pin a message you send into chat for the channel",
	modOnly: true,
	args: ["message"],
	async exec(args, channel) {
		const message = args.join(" ");

		if (!message) {
			throw new CommandError(ErrorMessage.MISSING_ARG(this.args[0]));
		}

		await channel.chat.send(message, { pin: true });
	},
});
