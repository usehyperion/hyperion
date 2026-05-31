import { app } from "$lib/app.svelte";
import WarnAck from "$lib/components/message/events/WarnAck.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.warning.acknowledge",
	async handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		const viewer = await channel.viewers.fetch(data.user_id);

		channel.chat.event(WarnAck, { viewer });
	},
});
