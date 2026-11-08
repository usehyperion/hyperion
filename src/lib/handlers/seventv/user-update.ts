import { app } from "#lib/app.svelte.js";
import EmoteSetChange from "#lib/components/message/events/EmoteSetChange.svelte";

import { defineHandler, seventvActor } from "../helper";

export default defineHandler("seventv", {
	name: "user.update",
	async handle(data) {
		const channel = app.channels.values().find((c) => c.seventvId === data.id);
		if (!channel) return;

		const root = data.updated?.find((c) => c.key === "connections");
		if (!root) return;

		const child = root.value.find(
			(c) => c.key === "emote_set" && c.value?.id !== channel.emoteSetId,
		);
		if (!child) return;

		channel.emotes.clear("7TV");

		// Follow the new set before fetching its emotes so its updates aren't
		// missed if the fetch fails.
		await channel.setSeventv(channel.seventvId, child.value?.id ?? null);

		const actor = await seventvActor(channel, data.actor);
		if (actor) channel.chat.event(EmoteSetChange, { name: child.value?.name, actor });

		// Loads the new set's emotes if 7TV emotes are enabled.
		await channel.emotes.fetch();
	},
});
