import { app } from "$lib/app.svelte";
import type { UserMessage } from "$lib/models/message/user-message";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.chat.user_message_update",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel || data.status === "invalid") return;

		const message = channel.chat.messages.find(
			(m): m is UserMessage => m.id === data.message_id,
		);

		if (message) message.deleted = true;

		channel.chat.notice(`A moderator ${data.status} your message.`);
	},
});
