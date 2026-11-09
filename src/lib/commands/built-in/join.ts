import { app } from "#lib/app.svelte.js";
import { CommandError } from "#lib/errors/command-error.js";
import { ErrorMessage } from "#lib/errors/messages.js";

import { defineCommand, mapErrors } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "join",
	description: "Join a channel",
	args: ["channel"],
	async exec(args) {
		if (!args[0]) {
			throw new CommandError(ErrorMessage.MISSING_ARG(this.args[0]));
		}

		await mapErrors(
			() => app.openByLogin(args[0].toLowerCase()),
			[{ status: 404, message: ErrorMessage.USER_NOT_FOUND(args[0]) }],
		);
	},
});
