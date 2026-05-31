<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		active: boolean;
		previous: "monitoring" | "restricting" | null;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { active, previous, viewer, moderator }: Props = $props();

	const monitored = $derived(viewer.monitored);
	const restricted = $derived(viewer.restricted);
</script>

{@html colorizeName(moderator)}
{active ? "started" : "stopped"}
{monitored ? "monitoring" : restricted ? "restricting" : previous}
{@html colorizeName(viewer)}'s messages.
