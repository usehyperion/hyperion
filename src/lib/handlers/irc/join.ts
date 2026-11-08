import { app } from "#lib/app.svelte.js";
import Join from "#lib/components/message/events/Join.svelte";
import { log } from "#lib/log.js";

import { defineHandler } from "../helper";

export default defineHandler("irc", {
	name: "join",
	async handle(data) {
		// Twitch only sends the user's own joins, since membership isn't
		// requested.
		const channel = app.channels.getByLogin(data.channel_login);
		if (!channel || data.user_login !== app.user?.username) return;

		void app.user?.sendPresence(channel.id);

		channel.chat.event(Join, { channel });

		log.info(`Joined ${channel.user.displayName}`);
	},
});
