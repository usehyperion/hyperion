import { ErrorMessage } from "#lib/errors/messages.js";

import { command } from "../define";
import { DEFAULT_TIMEOUT, durationRangeMessage, MAX_TIMEOUT, MIN_TIMEOUT } from "../parse";

export default command({
	name: "timeout",
	description: "Temporarily restrict a user from sending messages",
	permission: "mod",
	args: [
		{ type: "viewer", name: "username" },
		{
			type: "duration",
			name: "duration",
			min: MIN_TIMEOUT,
			max: MAX_TIMEOUT,
			default: DEFAULT_TIMEOUT,
		},
		{ type: "text", name: "reason", optional: true },
	],
	errors: ({ username }) => ({
		TARGET_ALREADY_BANNED: ErrorMessage.USER_ALREADY_BANNED(username.displayName),
		DURATION_INVALID: durationRangeMessage(MIN_TIMEOUT, MAX_TIMEOUT),
	}),
	fallback: ({ username }) => `${username.displayName} cannot be timed out.`,
	async exec({ username, duration, reason }) {
		await username.timeout({ duration, reason });
	},
});
