import { openDialog } from "$lib/components/ui/Dialog.svelte";
import { CommandError } from "$lib/errors/command-error";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "prediction",
	description: "Create a prediction for the channel",
	modOnly: true,
	async exec(_, channel) {
		if (channel.prediction?.status === "ACTIVE" || channel.prediction?.status === "LOCKED") {
			throw new CommandError("A prediction is already active.");
		}

		openDialog(`prediction-dialog-${channel.id}`);
	},
});
