import { error } from "@sveltejs/kit";

import { app } from "#lib/app.svelte.js";

export async function load() {
	if (!app.user) error(401);

	try {
		await app.user.loadWhispers();
	} catch (err) {
		error(502, `Failed to load whispers: ${String(err)}`);
	}

	return {
		whispers: app.user.whispers,
	};
}
