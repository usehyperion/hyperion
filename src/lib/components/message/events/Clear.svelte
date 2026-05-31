<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		moderator?: Viewer;
	}

	const { moderator }: Props = $props();
</script>

{#if moderator}
	{@html colorizeName(moderator)} cleared the chat
{:else}
	The chat has been cleared
{/if}

for non-moderator viewers.
