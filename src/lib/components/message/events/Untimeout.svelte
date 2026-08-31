<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		viewer: Viewer;
		moderator: Viewer;
	}

	const { viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> removed timeout on <Username user={viewer.user} />.
