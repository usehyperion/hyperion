import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "user-moderation-notifications",
	handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { message_id, status } = payload.data;

		// This is delayed compared to receiving a drop reason
		if (status === "PENDING") return;

		const held = channel.chat.messages.find((m): m is UserMessage => m.id === message_id);
		if (held) held.deleted = true;

		channel.chat.notice(`A moderator ${status.toLowerCase()} your message.`);
	},
});
