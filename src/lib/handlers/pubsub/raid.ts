import { app } from "$lib/app.svelte";
import Raid from "$lib/components/message/events/Raid.svelte";
import Unraid from "$lib/components/message/events/Unraid.svelte";

import { defineHandler } from "../helper";

// Only the first `update` is allowed to go through for the initial message
const announced = new Set<string>();

// `cancel` events are sent multiple times for some reason so it needs to be
// tracked
const canceled = new Set<string>();

export default defineHandler({
	name: "raid",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { raid } = payload;

		if (payload.type === "raid_cancel_v2") {
			if (canceled.has(raid.id)) return;

			canceled.add(raid.id);
			announced.delete(raid.id);
		} else {
			if (announced.has(raid.id) || canceled.has(raid.id)) return;

			announced.add(raid.id);
		}

		const moderator = await channel.viewers.fetch(raid.creator_id);
		const user = await channel.client.users.fetch(raid.target_id);

		if (payload.type === "raid_cancel_v2") {
			channel.chat.event(Unraid, { user, moderator });
			return;
		}

		channel.chat.event(Raid, { viewers: raid.viewer_count, user, moderator });
	},
});
