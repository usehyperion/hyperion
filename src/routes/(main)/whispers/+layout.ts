import { error } from "@sveltejs/kit";

import { app } from "#lib/app.svelte.js";
import { log } from "#lib/log.js";

export async function load() {
	if (!app.user) error(401);

	try {
		await app.user.loadWhispers();
	} catch (err) {
		log.error("Failed to load whispers", err);
	}

	return {
		whispers: app.user.whispers,
	};
}
