import { app } from "#lib/app.svelte.js";

import { defineHandler } from "../helper";

export default defineHandler("seventv", {
	name: "emote_set.create",
	handle(data) {
		app.cosmetics.personalSets.set(data.id, []);
	},
});
