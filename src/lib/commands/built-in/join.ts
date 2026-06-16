import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { app } from "$lib/app.svelte";
import { CommandError } from "$lib/errors/command-error";
import { ErrorMessage } from "$lib/errors/messages";
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

		let channel = app.channels.getByLogin(args[0]);

		if (!channel) {
			channel = await mapErrors(
				() => app.channels.fetch(args[0], { by: "login" }),
				[{ status: 404, message: ErrorMessage.USER_NOT_FOUND(args[0]) }],
			);
			channel.ephemeral = true;

			app.channels.set(channel.id, channel);
		}

		await goto(
			resolve("/(main)/channels/[username]", {
				username: args[0],
			}),
		);
	},
});
