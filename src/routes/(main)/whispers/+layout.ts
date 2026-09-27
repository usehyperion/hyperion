import { error } from "@sveltejs/kit";

import { app } from "$lib/app.svelte";
import { log } from "$lib/log";

export async function load() {
	if (!app.user) error(401);

	try {
		await app.user.loadWhispers();
	} catch (err) {
		void log.error(`Failed to load whispers: ${String(err)}`);
	}

	return {
		whispers: app.user.whispers,
	};
}
