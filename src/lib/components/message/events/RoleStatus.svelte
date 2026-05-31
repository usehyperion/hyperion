<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		role: string;
		added: boolean;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { role, added, viewer, moderator }: Props = $props();
</script>

{@html colorizeName(moderator)}
{added ? "added" : "removed"}
{@html colorizeName(viewer)} as a {role}.
