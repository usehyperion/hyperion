import { app } from "$lib/app.svelte";
import { UserMessage } from "$lib/models/message/user-message.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "privmsg",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const message = new UserMessage(channel, data);
		const badges = (data.source ?? data).badges;

		message.author.color = data.name_color;
		message.author.username = data.sender.login;
		message.author.displayName = data.sender.name;

		message.viewer ??= await channel.viewers.fetch(data.sender.id);
		message.viewer.broadcaster = badges.some((b) => b.name.startsWith("broadcaster"));
		message.viewer.moderator = message.viewer.broadcaster || data.is_mod;
		message.viewer.subscriber = data.is_subscriber;
		message.viewer.vip = badges.some((b) => b.name.startsWith("vip"));
		message.viewer.returning = data.is_returning_chatter;
		message.viewer.new = data.is_first_msg;

		if (data.source) {
			await message.setSource(data.source);
		}

		channel.chat.add(message);

		if (data.custom_reward_id) {
			channel.chat.redemptions.attachMessage(data.custom_reward_id, data.sender.id, message);
		}
	},
});
