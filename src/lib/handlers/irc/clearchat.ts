import { app } from "#lib/app.svelte.js";
import Banned from "#lib/components/message/events/Banned.svelte";
import BanStatus from "#lib/components/message/events/BanStatus.svelte";
import Clear from "#lib/components/message/events/Clear.svelte";
import Timeout from "#lib/components/message/events/Timeout.svelte";

import { defineHandler, reportedByPubSub } from "../helper";

export default defineHandler("irc", {
	name: "clearchat",
	async handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel) return;

		const meta = { recent: data.is_recent, timestamp: data.server_timestamp };

		// PubSub doesn't tell users about their own ban.
		if (data.action.type === "ban" && !data.is_recent && data.action.user_id === app.user?.id) {
			channel.chat.deleteMessages(app.user.id);
			channel.banned = true;
			channel.chat.event(Banned, { channel }, meta);

			return;
		}

		if (reportedByPubSub(channel, data.is_recent)) return;

		if (data.action.type === "clear") {
			channel.chat.deleteMessages();
			channel.chat.event(Clear, {}, meta);

			return;
		}

		const target = await channel.viewers.fetch(data.action.user_id);
		channel.chat.deleteMessages(target.id);

		if (data.action.type === "ban") {
			channel.chat.event(BanStatus, { banned: true, reason: null, viewer: target }, meta);
		} else {
			channel.chat.event(
				Timeout,
				{ seconds: data.action.duration, reason: null, viewer: target },
				meta,
			);
		}
	},
});
