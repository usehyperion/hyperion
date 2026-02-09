import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.poll.begin",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		channel.poll = {
			title: data.title,
			choices: data.choices,
		};
	},
});
