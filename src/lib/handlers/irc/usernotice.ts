import { app } from "#lib/app.svelte.js";
import { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("irc", {
	name: "usernotice",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const message = await UserMessage.fromIrc(channel, data);

		if (message.event?.type === "raid" && !data.is_recent && channel.stream) {
			channel.stream.viewers += message.event.viewer_count;
		}

		channel.chat.add(message);
	},
});
