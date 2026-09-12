import { app } from "$lib/app.svelte";
import Raid from "$lib/components/message/events/Raid.svelte";
import Unraid from "$lib/components/message/events/Unraid.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "raid",
	async handle(payload) {
		if (payload.type === "raid_update_v2") return;

		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { raid } = payload;

		const moderator = await channel.viewers.fetch(raid.creator_id);
		const user = await channel.client.users.fetch(raid.target_id);

		if (payload.type === "raid_cancel_v2") {
			channel.chat.event(Unraid, { user, moderator });
			return;
		}

		channel.chat.event(Raid, { viewers: raid.viewer_count, user, moderator });
	},
});
