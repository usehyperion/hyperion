import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "ban",
	description: "Permanently ban a user from chat",
	permission: "mod",
	args: [
		{
			type: "viewer",
			name: "user",
		},
		{
			type: "text",
			name: "reason",
			optional: true,
		},
	],
	errors: (args) => ({
		TARGET_ALREADY_BANNED: CommandError.USER_ALREADY_BANNED(args.user.displayName),
	}),
	fallback: (args) => `${args.user.displayName} cannot be banned.`,
	async exec(args) {
		await args.user.ban(args.reason);
	},
});
