import { redirect } from "@sveltejs/kit";

import { app } from "#lib/app.svelte.js";
import { log } from "#lib/log.js";
import { Channel } from "#lib/models/channel.svelte.js";
import { CurrentUser } from "#lib/models/current-user.svelte.js";
import { User } from "#lib/models/user.svelte.js";
import { measure } from "#lib/perf.js";
import { storage } from "#lib/stores.js";
import { Session, getCredentials } from "#lib/twitch/session.js";

export const ssr = false;

export async function load({ url }) {
	if (!app.twitch.session) {
		const credentials = await measure("startup:credentials", getCredentials);
		app.twitch.session = credentials && new Session(credentials);
	}

	if (!app.twitch.session) {
		log.info("Stored token expired, clearing user");
		storage.state.user = null;
	}

	if (!storage.state.user) {
		if (url.pathname !== "/auth/login") {
			log.info("User not authenticated, redirecting to login");
			redirect(302, "/auth/login");
		}

		return;
	}

	if (!app.user) {
		const user = new User(app.twitch, storage.state.user);
		app.twitch.users.set(user.id, user);

		app.user = new CurrentUser(user);
	}

	// Each of these loads once, and is retried on the next load if it failed.
	await app.user.loadModerating();

	if (!app.channels.has(app.user.id)) {
		const self = new Channel(app.twitch, app.user);
		app.channels.set(self.id, self);
	}

	void app.user.loadFollowing().catch((error) => {
		void log.error(`Failed to load followed channels: ${String(error)}`).catch(() => {});
	});

	void app.user.loadWhispers().catch((error) => {
		void log.error(`Failed to load whispers: ${String(error)}`).catch(() => {});
	});

	await Promise.all([
		measure("startup:global-emotes", () => app.emotes.fetch()).catch((error) => {
			void log.error(`Failed to load global emotes: ${String(error)}`).catch(() => {});
		}),
		measure("startup:global-badges", () => app.badges.load()).catch((error) => {
			void log.error(`Failed to load global badges: ${String(error)}`).catch(() => {});
		}),
	]);
}
