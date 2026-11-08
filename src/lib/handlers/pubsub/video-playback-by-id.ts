import { app } from "#lib/app.svelte.js";
import StreamStatus from "#lib/components/message/events/StreamStatus.svelte";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "video-playback-by-id",
	async handle(data) {
		const channel = app.channels.get(data.target_id);
		if (!channel) return;

		switch (data.type) {
			case "stream-up": {
				await channel.fetchStream();
				channel.chat.event(StreamStatus, { channel, online: true });

				return;
			}

			case "stream-down": {
				channel.stream = null;
				channel.chat.setPin(null);
				channel.chat.event(StreamStatus, { channel, online: false });

				return;
			}
		}
	},
});
