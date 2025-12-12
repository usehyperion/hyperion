<script lang="ts">
	import Channel from "$lib/components/Channel.svelte";

	const { data } = $props();
</script>

<Channel channel={data.channel} />
