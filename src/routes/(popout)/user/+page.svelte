<script lang="ts">
	import { emit, listen } from "@tauri-apps/api/event";
	import { getCurrentWindow } from "@tauri-apps/api/window";
	import { onMount } from "svelte";

	import { goto } from "$app/navigation";

	import { mark } from "#lib/perf.js";
	import { USER_CARD_ASSIGN, USER_CARD_IDLE, type UserCardAssignment } from "#lib/user-cards.js";

	// Spare popouts wait here, hidden and already booted, until the main window
	// assigns them a user. Navigating client-side from here skips loading the
	// app again, which is most of the cost of opening a card.
	onMount(() => {
		const { label } = getCurrentWindow();

		const unlisten = listen<UserCardAssignment>(
			USER_CARD_ASSIGN,
			({ payload }) => {
				performance.clearMarks();
				mark("card:assigned");

				const params = new URLSearchParams({
					channel: payload.channelId,
					t: payload.openedAt.toString(),
				});

				void goto(`/user/${payload.userId}?${params}`, { replaceState: true });
			},
			{ target: label },
		);

		void unlisten.then(() => emit(USER_CARD_IDLE, { label }));

		return () => void unlisten.then((fn) => fn());
	});
</script>
