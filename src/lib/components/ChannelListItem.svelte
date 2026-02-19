<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import type { Channel } from "$lib/models/channel.svelte";
	import StreamInfo from "./StreamInfo.svelte";
	import StreamTooltip from "./StreamTooltip.svelte";

	interface Props {
		channel: Channel;
		dragging: boolean;
		attach: Attachment<HTMLElement>;
	}

	const { channel, dragging, attach }: Props = $props();
</script>

<div class="relative px-1.5" {@attach attach}>
	<div class:invisible={dragging}>
		<StreamTooltip {channel} />
	</div>

	{#if dragging}
		<div class="absolute inset-1.5 flex items-center gap-2 px-1.5 opacity-70">
			<StreamInfo {channel} />
		</div>
	{/if}
</div>
