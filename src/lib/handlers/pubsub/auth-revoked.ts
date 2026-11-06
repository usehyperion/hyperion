import { app } from "#lib/app.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("pubsub", {
	name: "auth_revoked",
	handle(data) {
		// Twitch revokes moderator topics when the user is unmodded.
		if (data.topic === "chat_moderator_actions") {
			void app.channels.get(data.target_id)?.setModerated(false);
		}
	},
});
