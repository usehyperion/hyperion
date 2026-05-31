import { app } from "$lib/app.svelte";
import StreamStatus from "$lib/components/message/events/StreamStatus.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "stream.online",
	async handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		channel.stream = await channel.fetchStream();

		channel.chat.event(StreamStatus, { channel, online: true });
	},
});
