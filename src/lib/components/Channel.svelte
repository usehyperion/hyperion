<script lang="ts">
	import { listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { onDestroy, onMount } from "svelte";
	import Chat from "$lib/components/chat/Chat.svelte";
	import ChatInput from "$lib/components/chat/Input.svelte";
	import StreamHeader from "$lib/components/StreamHeader.svelte";
	import { handlers } from "$lib/handlers";
	import type { Channel } from "$lib/models/channel.svelte";
	import { Poll } from "$lib/models/poll.svelte";
	import type { IrcMessage } from "$lib/twitch/irc";
	import LiveNotices from "./chat/LiveNotices.svelte";
	import PollDialog, { pollOpen } from "./chat/PollDialog.svelte";
	import PredictionDialog, { predictionOpen } from "./chat/PredictionDialog.svelte";

	interface Props {
		channel: Channel;
		split?: boolean;
	}

	const { channel, split = false }: Props = $props();

	let unlisten: UnlistenFn | undefined;

	onMount(async () => {
		await channel.join(split);

		unlisten = await listen<IrcMessage[]>("recentmessages", async (event) => {
			for (const message of event.payload) {
				// Needs to be sequential
				// oxlint-disable-next-line no-await-in-loop
				await handlers.get(message.type)?.handle(message);
			}
		});
	});

	onDestroy(() => unlisten?.());
</script>

<div class="flex h-full flex-col">
	{#if channel.stream}
		<StreamHeader stream={channel.stream} />
	{/if}

	<div class="relative grow">
		<LiveNotices chat={channel.chat} />

		<Chat chat={channel.chat} />
	</div>

	<PollDialog {channel} bind:open={pollOpen.value} />

	<PredictionDialog {channel} bind:open={predictionOpen.value} />

	<div class="p-2">
		<ChatInput chat={channel.chat} />
	</div>
</div>
