import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "broadcast-settings-update",
	handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		if (data.old_status !== data.status) {
			channel.chat.notice(`The stream title has been updated to "${data.status}"`);

			if (channel.stream) {
				channel.stream.title = data.status;
			}
		}
	},
});
