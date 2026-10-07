<script lang="ts">
	import { listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { onDestroy, onMount } from "svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { IrcMessage } from "#lib/twitch/irc.js";

	import { handlers } from "#lib/handlers/index.js";

	import Chat from "../chat/Chat.svelte";
	import ChatInput from "../chat/ChatInput.svelte";
	import LiveNotices from "../chat/LiveNotices.svelte";
	import PollDialog from "../chat/PollDialog.svelte";
	import PredictionDialog from "../chat/PredictionDialog.svelte";
	import StreamHeader from "../stream/StreamHeader.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	// svelte-ignore state_referenced_locally
	const chat = channel.chat;

	let unlisten: UnlistenFn | undefined;

	onMount(async () => {
		await channel.join();

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

<div class="flex h-full flex-col" data-component="channel">
	{#if channel.stream}
		<StreamHeader stream={channel.stream} />
	{/if}

	<div class="relative grow" data-slot="channel-body">
		<LiveNotices {chat} />

		<Chat {chat} />
	</div>

	<PollDialog {channel} />

	<PredictionDialog {channel} />

	<div class="p-2" data-slot="channel-footer">
		<ChatInput {chat} />
	</div>
</div>
