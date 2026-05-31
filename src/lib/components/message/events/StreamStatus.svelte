<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		channel: Channel;
		online: boolean;
	}

	const { channel, online }: Props = $props();
</script>

{@html colorizeName(channel.user)} is now {online ? "online" : "offline"}.
