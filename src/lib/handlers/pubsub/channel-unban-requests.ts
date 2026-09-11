import { app } from "$lib/app.svelte";
import UnbanRequest from "$lib/components/message/events/UnbanRequest.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "channel-unban-requests",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const viewer = await channel.viewers.fetch(payload.data.requester_id);

		if (payload.type === "create_unban_request") {
			channel.chat.event(UnbanRequest, { request: payload.data, viewer });
			return;
		}

		const { resolver_id } = payload.data;

		// Requests resolve without a moderator when the viewer is unbanned
		const moderator = resolver_id ? await channel.viewers.fetch(resolver_id) : undefined;

		channel.chat.event(UnbanRequest, { request: payload.data, viewer, moderator });
	},
});
