<script lang="ts">
	import { onMount } from "svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";

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

	onMount(() => channel.join());
</script>

<div class="flex h-full flex-col">
	{#if channel.stream}
		<StreamHeader stream={channel.stream} />
	{/if}

	<div class="relative grow">
		<LiveNotices {chat} />

		<Chat {chat} />
	</div>

	<PollDialog {channel} />

	<PredictionDialog {channel} />

	<div class="p-2">
		<ChatInput {chat} />
	</div>
</div>
