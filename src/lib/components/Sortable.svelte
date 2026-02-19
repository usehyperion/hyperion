<script lang="ts">
	import { createSortable } from "@dnd-kit/svelte/sortable";
	import type { Channel } from "$lib/models/channel.svelte";
	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
		index: number;
	}

	const { channel, index }: Props = $props();

	const sortable = $derived(
		createSortable({
			id: `${channel.id}:channel-list/pinned`,
			type: "channel-list-item",
			index,
		}),
	);
</script>

<ChannelListItem {channel} dragging={sortable.isDragging} attach={sortable.attach} />
