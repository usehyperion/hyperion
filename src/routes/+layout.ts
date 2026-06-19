import { redirect } from "@sveltejs/kit";
import { invoke } from "@tauri-apps/api/core";
import { app } from "$lib/app.svelte";
import { log } from "$lib/log";
import { Channel } from "$lib/models/channel.svelte";
import { CurrentUser } from "$lib/models/current-user.svelte";
import { Stream } from "$lib/models/stream.svelte";
import { User } from "$lib/models/user.svelte";
import { storage } from "$lib/stores";
import type { BasicUser } from "$lib/twitch/irc";
import type { Prefix } from "$lib/util";

export const ssr = false;

export async function load({ url }) {
	if (url.searchParams.has("detached")) {
		return { detached: true };
	}

	app.twitch.token ??= await invoke<string | null>("get_token");

	if (!app.twitch.token) {
		log.info("Stored token expired, clearing user");
		storage.state.user = null;
	}

	if (!storage.state.user) {
		if (url.pathname !== "/auth/login") {
			log.info("User not authenticated, redirecting to login");
			redirect(302, "/auth/login");
		}

		return { detached: false };
	}

	if (!app.user) {
		const user = new User(app.twitch, storage.state.user);
		app.twitch.users.set(user.id, user);

		app.user = new CurrentUser(user);
	}

	if (!app.user.moderating.size) {
		app.user.moderating.add(app.user.id);

		const { data } = await app.twitch.get<Prefix<BasicUser, "broadcaster">[]>(
			"/moderation/channels",
			{ user_id: app.user.id, first: 100 },
		);

		for (const channel of data) {
			app.user.moderating.add(channel.broadcaster_id);
		}
	}

	if (!app.channels.size) {
		const following = await app.user.fetchFollowing();

		for (const followed of following) {
			let stream: Stream | null = null;

			if (followed.stream) {
				stream = new Stream(app.twitch, followed.id, followed.stream);

				for (const { user } of followed.channel?.guestStarSessionCall?.guests ?? []) {
					stream.addGuest({
						...user,
						viewers: user.stream?.viewersCount ?? null,
					});
				}
			}

			const user = new User(app.twitch, followed);
			const channel = new Channel(app.twitch, user, stream);

			app.channels.set(channel.id, channel);
		}

		const self = new Channel(app.twitch, app.user);
		app.channels.set(self.id, self);
	}

	if (!app.emotes.size) {
		await app.emotes.fetch();
	}

	if (!app.badges.size) {
		await app.badges.fetch();
	}

	return { detached: false };
}
