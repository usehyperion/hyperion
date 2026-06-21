import { app } from "$lib/app.svelte";
import Redemption from "$lib/components/message/Redemption.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "community-points-channel-v1",
	async handle(msg) {
		// Don't care about the other event types
		if (msg.type !== "reward-redeemed") return;

		const { redemption } = msg.data;

		const channel = app.channels.get(redemption.channel_id);
		if (!channel) return;

		// Input-required rewards also emit a PRIVMSG; attach the reward to that
		// message instead of rendering it separately
		if (redemption.reward.is_user_input_required) {
			channel.chat.redemptions.attachReward(redemption.reward, redemption.user.id);
		} else {
			const viewer = await channel.viewers.fetch(redemption.user.id);

			channel.chat.component(Redemption, {
				reward: redemption.reward,
				viewer,
			});
		}
	},
});
