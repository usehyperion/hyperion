import { app } from "$lib/app.svelte";
import Delete from "$lib/components/message/events/Delete.svelte";
import type { UserMessage } from "$lib/models/message/user-message.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "clearmsg",
	handle(data) {
		const channel = app.channels.getByLogin(data.channel_login);
		if (!channel) return;

		const message = channel.chat.messages.find(
			(m): m is UserMessage => m.isUser() && m.id === data.message_id,
		);

		if (!message) return;

		message.deleted = true;

		if (data.is_recent || (!data.is_recent && channel.isMod)) {
			channel.chat.event(Delete, { text: data.message_text, user: message.author }, data);
		}
	},
});
