import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.chat.update",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);

		if (channel?.stream) {
			channel.stream.title = data.title;
		}
	},
});
