import { error } from "@sveltejs/kit";

import { app } from "$lib/app.svelte";
import { Channel } from "$lib/models/channel.svelte";

export async function load({ params, url, parent }) {
	// Loads run concurrently by default, so this waits on the root layout for
	// the API token, the current user's moderator list, and global badges.
	await parent();

	const login = url.searchParams.get("channel");
	if (!login) error(400, "A channel is required to open a user card");

	const [user, broadcaster] = await Promise.all([
		app.twitch.users.fetch(params.id),
		app.twitch.users.fetch(login, { by: "login" }),
	]);

	let channel = app.channels.get(broadcaster.id);

	if (!channel) {
		// Deliberately not `channel.join()`: that invokes the Rust `join`
		// command, which would open a second set of chat connections for a
		// channel the main window is already subscribed to. Only the metadata
		// needed to render this user's badges and messages is fetched.
		channel = new Channel(app.twitch, broadcaster);
		app.channels.set(channel.id, channel);

		await Promise.all([
			channel.fetchBadges(),
			channel.emotes.fetch(),
			channel.fetchCheermotes(),
		]);
	}

	const relationship = await user.fetchRelationship(broadcaster.username);

	return { user, channel, relationship };
}
