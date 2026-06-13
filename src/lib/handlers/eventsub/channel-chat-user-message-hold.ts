import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.chat.user_message_hold",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		data.message.message_id = data.message_id;

		const message = UserMessage.from(channel, {
			message: data.message,
			sender: data,
		});

		message.autoMod = {
			category: "msg_hold",
			level: Number.NaN,
			boundaries: [],
		};

		channel.chat.add(message);
	},
});
