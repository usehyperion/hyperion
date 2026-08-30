import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "roomstate",
	handle(data) {
		const channel = app.channels.get(data.channel_id);
		if (!channel || data.is_recent) return;

		if (data.subscribers_only != null) {
			channel.chat.mode.subOnly = data.subscribers_only;
		}

		if (data.followers_only === -1) {
			channel.chat.mode.followerOnly = false;
		} else if (data.followers_only != null) {
			channel.chat.mode.followerOnly = data.followers_only;
		}

		if (data.slow_mode != null) {
			channel.chat.mode.slow = data.slow_mode;
		}

		if (data.unique_mode != null) {
			channel.chat.mode.unique = data.unique_mode;
		}

		if (data.emote_only != null) {
			channel.chat.mode.emoteOnly = data.emote_only;
		}
	},
});
