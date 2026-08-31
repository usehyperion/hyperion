<script lang="ts">
	import { getCurrentWindow } from "@tauri-apps/api/window";
	import { onDestroy, onMount, untrack } from "svelte";

	import { app } from "#lib/app.svelte.js";
	import UserCard from "#lib/components/user/UserCard.svelte";
	import { UserMessage, type UserMessageInit } from "#lib/models/message/user-message.svelte.js";
	import { Viewer } from "#lib/models/viewer.svelte.js";
	import { subscribeUserCard, type UserCardSync } from "#lib/user-cards.js";

	const { data } = $props();

	// A popout is bound to one user in one channel for the lifetime of its
	// window, so this data is read once rather than tracked.
	const { user, channel, relationship } = untrack(() => data);

	let history = $state<UserMessage[]>([]);
	let unsubscribe: (() => Promise<void>) | undefined;

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
	}

	function onMessage(init: UserMessageInit) {
		if (history.some((message) => message.id === init.id)) return;

		history.push(rebuild(init));
	}

	onMount(async () => {
		unsubscribe = await subscribeUserCard(
			{
				label: getCurrentWindow().label,
				userId: user.id,
				channelId: channel.id,
			},
			{ onSync, onMessage },
		);
	});

	onDestroy(() => void unsubscribe?.());
</script>

<svelte:head>
	<title>{user.displayName}</title>
</svelte:head>

<UserCard {user} {channel} {relationship} {history} />
