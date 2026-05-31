import { app } from "$lib/app.svelte";
import Banned from "$lib/components/message/events/Banned.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "notice",
	async handle(data) {
		const channel = app.channels.getByLogin(data.channel_login);
		if (!channel) return;

		if (!data.is_recent && app.user?.moderating.has(channel.id)) {
			return;
		}

		const meta = {
			deleted: data.deleted,
			is_recent: data.is_recent,
			server_timestamp: data.recent_timestamp ?? Date.now(),
		};

		switch (data.message_id) {
			case "emote_only_on":
			case "emote_only_off":
			case "followers_on":
			case "followers_on_zero":
			case "followers_off":
			case "r9k_on":
			case "r9k_off":
			case "slow_on":
			case "slow_off":
			case "subs_on":
			case "subs_off": {
				const text = data.message_text
					.replace("This room", "The chat")
					.replace("s-only", "-only");

				channel.chat.notice(text, meta);
				break;
			}

			case "msg_banned": {
				if (app.user) {
					app.user.banned.add(channel.id);
				}

				channel.chat.event(Banned, { channel }, meta);
				break;
			}
		}
	},
});
