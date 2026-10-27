<script lang="ts">
	import { getCurrentWindow } from "@tauri-apps/api/window";
	import { onDestroy, onMount, untrack } from "svelte";

	import { page } from "$app/state";

	import { app } from "#lib/app.svelte.js";
	import UserCard from "#lib/components/user/UserCard.svelte";
	import { log } from "#lib/log.js";
	import { UserMessage, type UserMessageInit } from "#lib/models/message/user-message.svelte.js";
	import { Viewer } from "#lib/models/viewer.svelte.js";
	import { mark, reportMarks } from "#lib/perf.js";
	import { subscribeUserCard, type UserCardSync } from "#lib/user-cards.js";

	const { data } = $props();

	// A popout is bound to one user in one channel for the lifetime of its
	// window, so this data is read once rather than tracked.
	const { user, channel, relationship, ready } = untrack(() => data);

	let history = $state<UserMessage[]>([]);
	let unsubscribe: (() => Promise<void>) | undefined;
	let destroyed = false;
	let reported = false;

	// Seeding the viewer up front means rebuilt messages resolve their author to
	// the fully fetched user rather than the partial one `UserMessage` would
	// otherwise synthesise from the raw payload.
	const viewer = new Viewer(channel, user);
	channel.viewers.set(user.id, viewer);

	function rebuild(init: UserMessageInit) {
		return UserMessage.fromJSON(channel, init);
	}

	function onSync(sync: UserCardSync) {
		if (sync.paint) app.u2p.set(user.id, sync.paint);

		if (sync.viewer) {
			viewer.broadcaster = sync.viewer.broadcaster;
			viewer.moderator = sync.viewer.moderator;
			viewer.subscriber = sync.viewer.subscriber;
			viewer.vip = sync.viewer.vip;
		}

		history = sync.messages.map(rebuild);

		if (!reported) {
			reported = true;
			mark("card:history");

			const openedAt = Number(page.url.searchParams.get("t")) || null;
			reportMarks(`user card ${user.username}`, openedAt);
		}
	}

	function onMessage(init: UserMessageInit) {
		if (history.some((message) => message.id === init.id)) return;

		history.push(rebuild(init));
	}

	onMount(async () => {
		mark("card:mounted");

		// Popouts start out as hidden spares, so they're only shown once there's
		// a card to show
		const popout = getCurrentWindow();

		void popout
			.setTitle(user.displayName)
			.then(() => popout.show())
			.then(() => popout.setFocus())
			.catch((error: unknown) =>
				log.error(`Failed to show user card: ${String(error)}`).catch(() => {}),
			);

		// Messages resolve their badges and emotes when they are rebuilt, so
		// history is only requested once the channel's metadata has loaded.
		await ready.catch((error: unknown) =>
			log
				.error(`Failed to load channel data for user card: ${String(error)}`)
				.catch(() => {}),
		);

		if (destroyed) return;

		mark("card:subscribe");

		unsubscribe = await subscribeUserCard(
			{
				label: popout.label,
				userId: user.id,
				channelId: channel.id,
			},
			{ onSync, onMessage },
		);

		if (destroyed) void unsubscribe();
	});

	onDestroy(() => {
		destroyed = true;
		void unsubscribe?.();
	});
</script>

<svelte:head>
	<title>{user.displayName}</title>
</svelte:head>

<UserCard {user} {channel} {relationship} messages={history} />
