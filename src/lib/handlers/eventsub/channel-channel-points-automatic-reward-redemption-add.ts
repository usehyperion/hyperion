import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.channel_points_automatic_reward_redemption.add",
	handle(data) {
		// Handled by IRC
		if (data.reward.type === "send_highlighted_message") return;
	},
});
