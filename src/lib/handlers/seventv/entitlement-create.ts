import { app } from "$lib/app.svelte";

import { defineHandler } from "../helper";

export default defineHandler({
	name: "entitlement.create",
	async handle(data) {
		const twitch = data.user.connections.find((c) => c.platform === "TWITCH");
		if (!twitch) return;

		const user = await app.twitch.users.fetch(twitch.id);

		switch (data.kind) {
			case "BADGE": {
				const badge = app.badges.get(data.ref_id);
				if (!badge) return;

				const badges = app.badges.users.getOrInsert(user.id, []);

				if (!badges.some((b) => b.id === badge.id)) {
					badges.push(badge);
				}

				break;
			}

			case "PAINT": {
				app.u2p.set(user.id, app.paints.get(data.ref_id));
				break;
			}

			case "EMOTE_SET": {
				const emoteSet = app.emoteSets.get(data.ref_id);
				if (!emoteSet) return;

				for (const emote of emoteSet.emotes) {
					user.emotes.set(emote.name, emote);
				}

				break;
			}
		}
	},
});
