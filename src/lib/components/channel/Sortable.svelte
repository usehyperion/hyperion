<script lang="ts">
	import { createSortable } from "@dnd-kit/svelte/sortable";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { DND, channelDrag } from "#lib/splits/dnd.js";

	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
		index: number;
	}

	const { channel, index }: Props = $props();

	const sortable = createSortable({
		get id() {
			return channel.id;
		},
		type: DND.pinned,
		accept: [DND.pinned],
		get index() {
			return index;
		},
		get data() {
			return channelDrag(channel);
		},
	});
</script>

<ChannelListItem {channel} dragging={sortable.isDragging} attach={sortable.attach} />
