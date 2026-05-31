<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName, formatDuration } from "$lib/util";

	interface Props {
		seconds: number;
		reason: string | null;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { seconds, reason, viewer, moderator }: Props = $props();

	const target = $derived(colorizeName(viewer));
	const duration = $derived(formatDuration(seconds));
</script>

{#if moderator}
	{@html colorizeName(moderator)} timed out {@html target} for {duration}
{:else}
	{@html target} has been timed out for {duration}
{/if}{reason ? `: ${reason}` : "."}
