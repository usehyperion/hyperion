<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		reasons: string[];
		viewer: Viewer;
		moderator: Viewer;
	}

	const { reasons, viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} /> warned <Username user={viewer.user} />: {reasons
	.filter((r) => r)
	.join(", ")}
