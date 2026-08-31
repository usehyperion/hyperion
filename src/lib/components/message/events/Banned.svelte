<script lang="ts">
	import Button from "$lib/components/ui/Button.svelte";
	import Username from "$lib/components/user/Username.svelte";
	import type { Channel } from "$lib/models/channel.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

You are permanently banned from <Username user={channel.user} /> and cannot send messages. If you have
been unbanned, try
<Button variant="inline" onclick={() => channel.rejoin()}>rejoining</Button>.
