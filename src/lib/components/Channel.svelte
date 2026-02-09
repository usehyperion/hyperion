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
	import Poll from "./Poll.svelte";

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

	{#if channel.poll}
		<Poll poll={channel.poll} />
	{/if}

	<Chat class="grow" chat={channel.chat} />

	<div class="p-2">
		<ChatInput chat={channel.chat} />
	</div>
</div>
