import { app } from "#lib/app.svelte.js";
import { CommandError } from "#lib/errors/command-error.js";

import { command } from "../define";

export default command({
	name: "join",
	description: "Join a channel",
	args: [
		{
			type: "string",
			name: "channel",
		},
	],
	errors: (args) => ({ 404: CommandError.USER_NOT_FOUND(args.channel) }),
	async exec(args) {
		await app.openByLogin(args.channel.replace(/^@/, "").toLowerCase());
	},
});
