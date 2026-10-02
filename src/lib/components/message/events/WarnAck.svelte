<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		viewer: Viewer;
	}

	const { viewer }: Props = $props();
</script>

<Username user={viewer.user} /> acknowledged their warning.
