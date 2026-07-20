<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import { colorizeName } from "$lib/util";
	import Button from "../../ui/Button.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

You are permanently banned from {@html colorizeName(channel.user)} and cannot send messages. If you have
been unbanned, try
<Button class="h-min p-0" variant="link" onclick={() => channel.rejoin()}>rejoining</Button>.
