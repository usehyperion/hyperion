<script lang="ts">
	import { listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { onDestroy, onMount } from "svelte";
	import { handlers } from "$lib/handlers";
	import type { Channel } from "$lib/models/channel.svelte";
	import type { IrcMessage } from "$lib/twitch/irc";
	import Chat from "../chat/Chat.svelte";
	import ChatInput from "../chat/ChatInput.svelte";
	import LiveNotices from "../chat/LiveNotices.svelte";
	import PollDialog from "../chat/PollDialog.svelte";
	import PredictionDialog from "../chat/PredictionDialog.svelte";
	import StreamHeader from "../stream/StreamHeader.svelte";

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

	<PollDialog {channel} />

	<PredictionDialog {channel} />

	<div class="p-2">
		<ChatInput chat={channel.chat} />
	</div>
</div>
