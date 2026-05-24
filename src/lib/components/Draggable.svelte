<script lang="ts">
	import { createDraggable } from "@dnd-kit/svelte";
	import type { Channel } from "$lib/models/channel.svelte";
	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const draggable = createDraggable({
		get id() {
			return `channel:${channel.id}`;
		},
		get type() {
			return "channel";
		},
		get data() {
			return { kind: "channel", id: channel.id };
		},
	});
</script>

<ChannelListItem
	{channel}
	dragging={draggable.isDragging}
	placeholder="row"
	attach={draggable.attach}
/>
