import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "polls",
	handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		const { poll } = data.data;

		if (data.type === "POLL_COMPLETE") {
			channel.chat.completePoll(poll);
		} else {
			channel.chat.setPoll(poll);
		}
	},
});
