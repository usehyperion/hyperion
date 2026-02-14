import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Built-in",
	name: "block-term",
	description: "Block a term and prevent it from being used in chat",
	modOnly: true,
	args: ["term"],
	async exec(args, channel) {
		if (!args[0]) {
			throw new CommandError(ErrorMessage.MISSING_ARG(this.args[0]));
		}

		await channel.blockTerm(args.join(" "));
	},
});
