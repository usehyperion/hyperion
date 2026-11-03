<script lang="ts">
	import type { Attachment } from "svelte/attachments";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import StreamTooltip from "../stream/StreamTooltip.svelte";
	import ChannelIcon from "./ChannelIcon.svelte";

	interface Props {
		channel: Channel;
		dragging: boolean;
		attach: Attachment<HTMLElement>;
	}

	const { channel, dragging, attach }: Props = $props();
</script>

<div class="relative" {@attach attach}>
	<div class={[dragging && "invisible"]}>
		<StreamTooltip {channel} />
	</div>

	{#if dragging}
		<div class="absolute inset-1.5 flex items-center gap-2 px-1.5 opacity-70">
			<ChannelIcon {channel} />
		</div>
	{/if}
</div>
