import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";

import { defineCommand, parseBool, parseDuration } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "follower-only",
	description: "Restrict chat to followers based on their follow duration",
	modOnly: true,
	args: ["enabled", "duration"],
	async exec(args, channel) {
		let enabled: boolean | null = true;
		let duration = 0;

		// Ambiguous case
		if (args.length === 1) {
			// Try to parse as boolean first
			enabled = parseBool(args[0]);

			// Invalid boolish value, assume duration
			if (enabled === null) {
				enabled = true;
				duration = parseDuration(args[0]) ?? 0;
			}
		}
		// Both provided
		else if (args.length === 2) {
			enabled = parseBool(args[0]);
			duration = parseDuration(args[1]) ?? 0;
		}

		if (enabled === null) {
			throw new CommandError(ErrorMessage.INVALID_BOOL_ARG);
		}

		if (duration < 0 || duration > 129_600) {
			throw new CommandError(ErrorMessage.INVALID_FOLLOWER_DURATION);
		}

		await channel.chat.updateSettings({
			followerOnly: enabled,
			followerOnlyDuration: duration,
		});
	},
});
