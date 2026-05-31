import { app } from "$lib/app.svelte";
import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand, parseBool } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "reload-emotes",
	description: "Reload all emotes for the channel and optionally global emotes",
	args: ["include-global"],
	async exec(args, channel) {
		const includeGlobal = parseBool(args[0]);

		if (includeGlobal === null) {
			throw new CommandError(ErrorMessage.INVALID_BOOL_ARG);
		}

		await app.emotes.fetch(includeGlobal);
		await channel.emotes.fetch(true);

		channel.chat.notice("Reloaded emotes.");
	},
});
