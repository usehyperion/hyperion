<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		banned: boolean;
		reason: string | null;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { banned, reason, viewer, moderator }: Props = $props();

	const target = $derived(colorizeName(viewer));
	const action = $derived(banned ? "banned" : "unbanned");
</script>

{#if moderator}
	{@html colorizeName(moderator)} {action} {@html target}
{:else}
	{@html target} has been {action}
{/if}{reason ? `: ${reason}` : "."}
