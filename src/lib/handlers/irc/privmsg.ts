import { app } from "#lib/app.svelte.js";
import { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("irc", {
	name: "privmsg",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const message = await UserMessage.fromIrc(channel, data);
		channel.chat.add(message);

		// The user's own messages are the only sign of becoming a moderator,
		// since mod-only PubSub topics aren't subscribed until then.
		if (data.sender.id === app.user?.id && !data.is_recent) {
			await channel.setModerated(message.viewer.moderator);
		}

		if (data.custom_reward_id) {
			channel.chat.redemptions.attachMessage(data.custom_reward_id, data.sender.id, message);
		}
	},
});
