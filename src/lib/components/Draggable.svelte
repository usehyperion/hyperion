<script lang="ts">
	import { createDraggable } from "@dnd-kit/svelte";
	import type { Channel } from "$lib/models/channel.svelte";
	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const draggable = $derived(
		createDraggable({
			id: `${channel.id}:channel-list`,
			type: "channel-list-item",
		}),
	);
</script>

<ChannelListItem {channel} dragging={draggable.isDragging} attach={draggable.attach} />
