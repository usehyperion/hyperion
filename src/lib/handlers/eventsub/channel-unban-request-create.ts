import { app } from "$lib/app.svelte";
import UnbanRequest from "$lib/components/message/events/UnbanRequest.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel.unban_request.create",
	async handle(data) {
		const channel = app.channels.get(data.broadcaster_user_id);
		if (!channel) return;

		const viewer = await channel.viewers.fetch(data.user_id);

		channel.chat.event(UnbanRequest, { request: data, viewer });
	},
});
