<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { AutoModMessageStatus } from "$lib/twitch/eventsub";
	import { colorizeName } from "$lib/util";

	interface Props {
		status: AutoModMessageStatus;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { status, viewer, moderator }: Props = $props();

	const target = $derived(colorizeName(viewer));
</script>

{#if status === "expired"}
	{@html target}'s message expired and was not shown in chat.
{:else}
	{@html colorizeName(moderator)} {status} {@html target}'s message.
{/if}
