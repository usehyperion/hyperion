import { app } from "$lib/app.svelte";
import { defineHandler } from "../helper";

export default defineHandler({
	name: "emote_set.create",
	async handle(data) {
		const twitch = data.owner.connections.find((c) => c.platform === "TWITCH");
		if (!twitch) return;

		const owner = await app.twitch.users.fetch(twitch.id);

		app.emoteSets.set(data.id, {
			id: data.id,
			provider: "7TV",
			name: data.name,
			owner,
			global: false,
			emotes: [],
		});
	},
});
