<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { formatDuration } from "$lib/util";

	interface Props {
		seconds: number;
		reason: string | null;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { seconds, reason, viewer, moderator }: Props = $props();

	const duration = $derived(formatDuration(seconds));
</script>

{#if moderator}
	<Username user={moderator.user} /> timed out <Username user={viewer.user} /> for {duration}
{:else}
	<Username user={viewer.user} /> has been timed out for {duration}
{/if}{reason ? `: ${reason}` : "."}
