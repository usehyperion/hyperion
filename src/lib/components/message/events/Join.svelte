<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

Joined <Username user={channel.user} />
