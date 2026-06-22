import { pollOpen } from "$lib/components/chat/PollDialog.svelte";
import { defineCommand } from "../util";

export default defineCommand({
	provider: "Twitch",
	name: "poll",
	description: "Create a poll for the channel",
	modOnly: true,
	async exec() {
		pollOpen.value = true;
	},
});
