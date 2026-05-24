<script lang="ts">
	import { createSortable } from "@dnd-kit/svelte/sortable";
	import type { Channel } from "$lib/models/channel.svelte";
	import ChannelListItem from "./ChannelListItem.svelte";
	import { onMount } from "svelte";

	interface Props {
		channel: Channel;
		index: number;
	}

	const { channel, index }: Props = $props();

	onMount(() => {
		console.log("Creating sortable for channel", channel.user.username);
	});

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
