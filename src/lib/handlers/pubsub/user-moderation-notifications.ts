import { app } from "#lib/app.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "user-moderation-notifications",
	handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { status } = payload.data;

		// Sending already reported that the message is held.
		if (status === "PENDING") return;

		channel.chat.notice(`A moderator ${status.toLowerCase()} your message.`);
	},
});
