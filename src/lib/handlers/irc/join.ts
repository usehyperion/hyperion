import { app } from "$lib/app.svelte";
import Join from "$lib/components/message/events/Join.svelte";
import { log } from "$lib/log";
import { sendPresence } from "$lib/seventv";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "join",
	async handle(data) {
		const channel = app.channels.getByLogin(data.channel_login);
		if (!channel) return;

		// Channel should always have itself in its viewers map
		const viewer = channel.viewers
			.values()
			.find((user) => user.username === data.channel_login);

		if (!viewer) return;

		void sendPresence(channel.id);

		viewer.broadcaster = true;
		viewer.moderator = true;

		channel.chat.event(Join, { channel });

		log.info(`Joined ${channel.user.displayName}`);
	},
});
