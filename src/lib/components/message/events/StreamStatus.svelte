<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Channel } from "$lib/models/channel.svelte";

	interface Props {
		channel: Channel;
		online: boolean;
	}

	const { channel, online }: Props = $props();
</script>

<Username user={channel.user} /> is now {online ? "online" : "offline"}.
