import { app } from "#lib/app.svelte.js";
import Delete from "#lib/components/message/events/Delete.svelte";

import { defineHandler } from "../helper";

export default defineHandler("irc", {
	name: "clearmsg",
	handle(data) {
		const channel = app.channels.getByLogin(data.channel_login);
		if (!channel) return;

		const message = channel.chat.messages.find((m) => m.id === data.message_id);
		if (!message?.isUser()) return;

		message.deleted = true;

		// Live deletions from PubSub are only shown to moderators
		if (data.is_recent) {
			channel.chat.event(
				Delete,
				{ text: data.message_text, user: message.author },
				{ recent: data.is_recent, timestamp: data.server_timestamp },
			);
		}
	},
});
