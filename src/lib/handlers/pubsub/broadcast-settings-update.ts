import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "broadcast-settings-update",
	handle(data) {
		const channel = app.channels.get(data.channel_id);

		if (channel?.stream) {
			channel.stream.title = data.status;
		}
	},
});
