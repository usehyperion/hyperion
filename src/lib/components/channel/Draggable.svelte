<script lang="ts">
	import { createDraggable } from "@dnd-kit/svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";

	import { DND, channelDrag } from "#lib/splits/dnd.js";

	import ChannelListItem from "./ChannelListItem.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const draggable = createDraggable({
		get id() {
			return `channel:${channel.id}`;
		},
		type: DND.channel,
		get data() {
			return channelDrag(channel);
		},
	});
</script>

<ChannelListItem {channel} dragging={draggable.isDragging} attach={draggable.attach} />
