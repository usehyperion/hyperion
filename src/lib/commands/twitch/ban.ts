import { ErrorMessage } from "#lib/errors/messages.js";

import { command } from "../define";

export default command({
	name: "ban",
	description: "Permanently ban a user from chat",
	permission: "mod",
	args: [
		{ type: "viewer", name: "username" },
		{ type: "text", name: "reason", optional: true },
	],
	errors: ({ username }) => ({
		TARGET_ALREADY_BANNED: ErrorMessage.USER_ALREADY_BANNED(username.displayName),
	}),
	fallback: ({ username }) => `${username.displayName} cannot be banned.`,
	async exec({ username, reason }) {
		await username.ban(reason);
	},
});
