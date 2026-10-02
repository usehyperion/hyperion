<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

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
