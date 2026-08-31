<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Channel } from "$lib/models/channel.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

Joined <Username user={channel.user} />
