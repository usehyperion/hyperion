import { app } from "#lib/app.svelte.js";
import Banned from "#lib/components/message/events/Banned.svelte";

import { defineHandler, reportedByPubSub } from "../helper";

export default defineHandler("irc", {
	name: "notice",
	async handle(data) {
		const channel = data.channel_login && app.channels.getByLogin(data.channel_login);
		if (!channel) return;

		const meta = {
			deleted: data.deleted,
			recent: data.is_recent,
			timestamp: data.recent_timestamp ?? Date.now(),
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
				if (reportedByPubSub(channel, data.is_recent)) return;

				const text = data.message_text
					.replace("This room", "The chat")
					.replace("s-only", "-only");

				channel.chat.notice(text, meta);
				break;
			}

			case "msg_banned": {
				channel.banned = true;

				channel.chat.event(Banned, { channel }, meta);
				break;
			}
		}
	},
});
