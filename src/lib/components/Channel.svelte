<script lang="ts">
	import { listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { onDestroy, onMount } from "svelte";
	import Chat from "$lib/components/chat/Chat.svelte";
	import ChatInput from "$lib/components/chat/Input.svelte";
	import StreamHeader from "$lib/components/StreamHeader.svelte";
	import { handlers } from "$lib/handlers";
	import type { Channel } from "$lib/models/channel.svelte";
	import type { IrcMessage } from "$lib/twitch/irc";
	import Pinned from "./chat/Pinned.svelte";
	import Poll from "./chat/Poll.svelte";
	import PollDialog from "./chat/PollDialog.svelte";

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
		{#if channel.chat.pinned && !channel.chat.pinned.hidden}
			<Pinned pin={channel.chat.pinned} />
		{/if}

		<Chat chat={channel.chat} />

		{#if channel.chat.poll}
			<Poll poll={channel.chat.poll} />
		{/if}
	</div>

	<PollDialog {channel} bind:open={channel.chat.pollDialogOpen} />

	<div class="p-2">
		<ChatInput chat={channel.chat} />
	</div>
</div>
