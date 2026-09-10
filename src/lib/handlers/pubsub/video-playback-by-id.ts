import { app } from "$lib/app.svelte";
import StreamStatus from "$lib/components/message/events/StreamStatus.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "video-playback-by-id",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		switch (data.type) {
			case "stream-up": {
				channel.stream = await channel.fetchStream();

				channel.chat.event(StreamStatus, { channel, online: true });
				return;
			}

			case "stream-down": {
				channel.stream = null;
				channel.chat.clearPin();

				channel.chat.event(StreamStatus, { channel, online: false });
				return;
			}
		}
	},
});
