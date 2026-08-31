<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		viewer: Viewer;
	}

	const { viewer }: Props = $props();
</script>

<Username user={viewer.user} /> acknowledged their warning.
