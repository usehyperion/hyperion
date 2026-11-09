import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";
import { DEFAULT_TIMEOUT, durationRangeMessage, MAX_TIMEOUT, MIN_TIMEOUT } from "../parse";

export default command({
	name: "timeout",
	description: "Temporarily restrict a user from sending messages",
	permission: "mod",
	args: [
		{
			type: "viewer",
			name: "user",
		},
		{
			type: "duration",
			name: "duration",
			min: MIN_TIMEOUT,
			max: MAX_TIMEOUT,
			default: DEFAULT_TIMEOUT,
		},
		{
			type: "text",
			name: "reason",
			optional: true,
		},
	],
	errors: (args) => ({
		TARGET_ALREADY_BANNED: CommandError.USER_ALREADY_BANNED(args.user.displayName),
		DURATION_INVALID: durationRangeMessage(MIN_TIMEOUT, MAX_TIMEOUT),
	}),
	fallback: (args) => `${args.user.displayName} cannot be timed out.`,
	async exec(args) {
		await args.user.timeout({
			duration: args.duration,
			reason: args.reason,
		});
	},
});
