import { error } from "@sveltejs/kit";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { app } from "#lib/app.svelte.js";
import { log } from "#lib/log.js";
import { Channel } from "#lib/models/channel.svelte.js";
import { mark } from "#lib/perf.js";
import {
	deserializeRelationship,
	requestUserCardBootstrap,
	restoreChannelData,
	restoreGlobals,
} from "#lib/user-cards.js";

export async function load({ params, url, parent }) {
	const channelId = url.searchParams.get("channel");
	if (!channelId) error(400, "A channel is required to open a user card");

	// Loads run concurrently by default, so this waits on the root layout for
	// the API token. The main window is asked for what it already holds in the
	// meantime.
	mark("card:load-start");

	const [bootstrap] = await Promise.all([
		requestUserCardBootstrap({
			label: getCurrentWindow().label,
			userId: params.id,
			channelId,
		}).finally(() => mark("card:bootstrap")),
		parent().finally(() => mark("card:parent")),
	]);

	if (!bootstrap) {
		void log
			.warn("Main window did not answer user card bootstrap, fetching instead")
			.catch(() => {});
	}

	const [user, broadcaster] = await Promise.all([
		bootstrap?.user ? app.twitch.users.from(bootstrap.user) : app.twitch.users.fetch(params.id),
		bootstrap?.broadcaster
			? app.twitch.users.from(bootstrap.broadcaster)
			: app.twitch.users.fetch(channelId),
	]);

	mark("card:users");

	if (bootstrap?.moderator) app.user?.moderating.add(channelId);

	let channel = app.channels.get(broadcaster.id);

	if (!channel) {
		// Deliberately not `channel.join()`: that invokes the Rust `join`
		// command, which would open a second set of chat connections for a
		// channel the main window is already subscribed to.
		channel = new Channel(app.twitch, broadcaster);
		app.channels.set(channel.id, channel);
	}

	if (bootstrap?.relationship) {
		user.relationships.set(channel.id, deserializeRelationship(bootstrap.relationship));
	}

	await Promise.all([
		user.partial ? user.fetch() : null,
		user.relationships.has(channel.id) ? null : user.fetchRelationship(channel),
	]);

	mark("card:details");

	if (bootstrap?.globals) restoreGlobals(bootstrap.globals, user.id);
	if (bootstrap?.channel) restoreChannelData(channel, bootstrap.channel);

	// Badges, emotes, and cheermotes are only needed to render message history,
	// so the card is shown without waiting on them. Anything the main window
	// didn't send is fetched here instead.
	const ready = Promise.all([
		bootstrap?.globals ? null : Promise.all([app.emotes.fetch(), app.badges.fetch()]),
		bootstrap?.channel
			? null
			: Promise.all([
					channel.badges.fetch().finally(() => mark("channel:badges")),
					channel.emotes.fetch(),
					channel.cheermotes.fetch().finally(() => mark("channel:cheermotes")),
				]),
	]).then(() => mark("card:channel-data"));

	return { user, channel, relationship: user.relationships.get(channel.id), ready };
}
