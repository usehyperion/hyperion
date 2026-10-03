import { redirect } from "@sveltejs/kit";

import { app } from "#lib/app.svelte.js";
import { moderatesQuery } from "#lib/graphql/twitch.js";
import { log } from "#lib/log.js";
import { Channel } from "#lib/models/channel.svelte.js";
import { CurrentUser } from "#lib/models/current-user.svelte.js";
import { User } from "#lib/models/user.svelte.js";
import { storage } from "#lib/stores.js";
import { Session, getCredentials } from "#lib/twitch/session.js";

export const ssr = false;

export async function load({ url, route }) {
	if (!app.twitch.session) {
		const credentials = await getCredentials();
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

	// Popouts only render a single view and get anything channel-specific from
	// the main window, so the app-wide state below is skipped for them.
	const popout = route.id?.startsWith("/(popout)") ?? false;

	if (!popout && !app.user.moderating.size) {
		app.user.moderating.add(app.user.id);

		const moderates = await app.twitch.paginate(
			moderatesQuery,
			{},
			(data) => data.moderatedChannels,
		);

		for (const { id } of moderates) {
			app.user.moderating.add(id);
		}
	}

	if (!popout && !app.channels.size) {
		const self = new Channel(app.twitch, app.user);
		app.channels.set(self.id, self);

		void app.user.loadFollowing().catch((error) => {
			void log.error(`Failed to load followed channels: ${String(error)}`).catch(() => {});
		});

		void app.user.loadWhispers().catch((error) => {
			void log.error(`Failed to load whispers: ${String(error)}`).catch(() => {});
		});
	}

	await Promise.all([
		app.emotes.size ? null : app.emotes.fetch(),
		app.badges.size ? null : app.badges.fetch(),
	]);
}
