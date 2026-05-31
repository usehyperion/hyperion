<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		viewer: Viewer;
		moderator: Viewer;
	}

	const { viewer, moderator }: Props = $props();
</script>

{@html colorizeName(moderator)} removed timeout on {@html colorizeName(viewer)}.
