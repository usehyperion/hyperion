import { app } from "#lib/app.svelte.js";
import Raid from "#lib/components/message/events/Raid.svelte";
import Unraid from "#lib/components/message/events/Unraid.svelte";

import { defineHandler } from "../helper";

// Only the first `update` of a raid is announced, and `cancel` events are
// sent multiple times, so each raid's last announced state is tracked per raid
// id. Raid ids are unique, so this never needs clearing.
const announced = new Map<string, "started" | "canceled">();

export default defineHandler("pubsub", {
	name: "raid",
	async handle(payload) {
		const channel = app.channels.get(payload.target_id);
		if (!channel) return;

		const { raid } = payload;

		const state = payload.type === "raid_cancel_v2" ? "canceled" : "started";
		const previous = announced.get(raid.id);

		if (previous === state || previous === "canceled") return;
		announced.set(raid.id, state);

		const moderator = await channel.viewers.fetch(raid.creator_id);
		const user = await channel.client.users.fetch(raid.target_id);

		if (payload.type === "raid_cancel_v2") {
			channel.chat.event(Unraid, { user, moderator });
			return;
		}

		channel.chat.event(Raid, { viewers: raid.viewer_count, user, moderator });
	},
});
