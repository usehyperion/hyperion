import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, parseDuration } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "slow",
	description: "Limit how frequently users can send messages",
	modOnly: true,
	args: ["duration"],
	async exec(args, channel) {
		const duration = parseDuration(args[0]) ?? 30;

		if (duration !== 0 && (duration < 3 || duration > 120)) {
			throw new CommandError(ErrorMessage.INVALID_SLOW_DURATION);
		}

		await channel.chat.updateSettings({ slow: duration });
	},
});
