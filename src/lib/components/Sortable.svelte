<script lang="ts">
	import { createSortable } from "@dnd-kit/svelte/sortable";
	import type { Channel } from "$lib/models/channel.svelte";
	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
		index: number;
	}

	const { channel, index }: Props = $props();

	const sortable = createSortable({
		get id() {
			return `pinned:${channel.id}`;
		},
		get type() {
			return "pinned";
		},
		get accept() {
			return ["pinned"];
		},
		get index() {
			return index;
		},
		get data() {
			return { kind: "channel", id: channel.id };
		},
	});
</script>

<ChannelListItem
	{channel}
	dragging={sortable.isDragging}
	placeholder="circle"
	attach={sortable.attach}
/>
