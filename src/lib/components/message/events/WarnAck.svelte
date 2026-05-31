<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		viewer: Viewer;
	}

	const { viewer }: Props = $props();
</script>

{@html colorizeName(viewer)} acknowledged their warning.
