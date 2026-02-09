import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.channel_points_custom_reward_redemption.add",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;
	},
});
