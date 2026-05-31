import { app } from "$lib/app.svelte";
import Banned from "$lib/components/message/events/Banned.svelte";
import BanStatus from "$lib/components/message/events/BanStatus.svelte";
import Clear from "$lib/components/message/events/Clear.svelte";
import Timeout from "$lib/components/message/events/Timeout.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "clearchat",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		// Return early if the message isn't recent and the user is a moderator
		// in the channel to prevent showing two different messages.
		if (!data.is_recent && app.user?.moderating.has(channel.id)) {
			return;
		}

		if (data.action.type === "clear") {
			channel.chat.deleteMessages();
			channel.chat.event(Clear, {}, data);

			return;
		}

		const target = await channel.viewers.fetch(data.action.user_id);
		channel.chat.deleteMessages(target.id);

		if (data.action.type === "ban") {
			if (!data.is_recent && target.id === app.user?.id) {
				app.user.banned.add(channel.id);
				channel.chat.event(Banned, { channel }, data);
			} else {
				channel.chat.event(BanStatus, { banned: true, reason: null, viewer: target }, data);
			}
		} else {
			channel.chat.event(
				Timeout,
				{ seconds: data.action.duration.secs, reason: null, viewer: target },
				data,
			);
		}
	},
});
