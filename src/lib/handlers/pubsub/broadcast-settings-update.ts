import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "broadcast-settings-update",
	handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		if (channel.stream && data.old_status !== data.status) {
			channel.stream.title = data.status;
			channel.chat.notice(`The stream title has been updated to "${data.status}"`);
		}
	},
});
