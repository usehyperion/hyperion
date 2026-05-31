import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.subscription.end",
	handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel || data.user_id !== app.user?.id) return;

		const tier = data.tier === "Prime" ? "Prime" : `Tier ${data.tier[0]}`;
		const text = `Your ${data.is_gift ? "gifted" : ""} ${tier} subscription has ended.`;

		channel.chat.notice(text);
	},
});
