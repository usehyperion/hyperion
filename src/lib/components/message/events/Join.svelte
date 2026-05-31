<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

Joined {@html colorizeName(channel.user)}
