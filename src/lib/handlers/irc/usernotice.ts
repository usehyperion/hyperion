import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "usernotice",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const message = new UserMessage(channel, data);

		message.author.color = data.name_color;
		message.author.username = data.sender.login;
		message.author.displayName = data.sender.name;

		if (message.event?.type === "raid" && !data.is_recent && channel.stream) {
			channel.stream.viewers += message.event.viewer_count;
		}

		if (data.source) {
			await message.setSource(data.source);
		}

		channel.chat.add(message);
	},
});
