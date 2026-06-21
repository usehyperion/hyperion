import { app } from "$lib/app.svelte";
import Redemption from "$lib/components/message/Redemption.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "community-points-channel-v1",
	async handle(msg) {
		// Don't care about the other event types
		if (msg.type !== "reward-redeemed") return;

		console.log(msg);
		const { redemption } = msg.data;

		const channel = app.channels.get(redemption.channel_id);
		if (!channel) return;

		const viewer = await channel.viewers.fetch(redemption.user.id);

		// Input-required rewards also emit a PRIVMSG; let the redemption manager
		// merge the two into a single message. Other rewards have no associated
		// chat message, so render them standalone.
		if (redemption.reward.is_user_input_required) {
			channel.chat.redemptions.resolveReward(redemption.reward, redemption.user.id, viewer);
		} else {
			channel.chat.component(Redemption, { reward: redemption.reward, viewer });
		}
	},
});
