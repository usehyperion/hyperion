import { redirect } from "@sveltejs/kit";

import { app } from "#lib/app.svelte.js";
import { log } from "#lib/log.js";

export const ssr = false;

export async function load({ url }) {
	const user = await app.restoreSession();

	if (!user) {
		if (url.pathname !== "/auth/login") {
			log.info("User not authenticated, redirecting to login");
			redirect(302, "/auth/login");
		}

		return;
	}

	await app.load(user);
}
