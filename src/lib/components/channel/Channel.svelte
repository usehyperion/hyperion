<script lang="ts">
	import { onMount } from "svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { log } from "#lib/log.js";

	import Chat from "../chat/Chat.svelte";
	import ChatInput from "../chat/ChatInput.svelte";
	import LiveNotices from "../chat/LiveNotices.svelte";
	import PollDialog from "../chat/PollDialog.svelte";
	import PredictionDialog from "../chat/PredictionDialog.svelte";
	import StreamHeader from "../stream/StreamHeader.svelte";

	interface Props {
		channel: Channel;
	}

	const props: Props = $props();

	// SplitView keys this component by channel id, so the channel is fixed for
	// its lifetime. Capturing it keeps descendants from reading the pane's
	// channel after it becomes null while this subtree is being torn down.
	// svelte-ignore state_referenced_locally
	const { channel } = props;
	const chat = channel.chat;

	onMount(() => {
		channel.join().catch(log.swallow(`Failed to join ${channel.user.username}`));
	});
</script>

<div class="channel flex h-full flex-col" data-channel={channel.user.username}>
	{#if channel.stream}
		<StreamHeader {channel} stream={channel.stream} />
	{/if}

	<div class="chat-container relative grow">
		<LiveNotices {chat} />

		<Chat {chat} />
	</div>

	<PollDialog {channel} />

	<PredictionDialog {channel} />

	<div class="chat-input-container p-2">
		<ChatInput {chat} />
	</div>
</div>
