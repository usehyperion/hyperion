<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		viewer: Viewer;
		moderator: Viewer;
	}

	const { viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> removed timeout on <Username user={viewer.user} />.
