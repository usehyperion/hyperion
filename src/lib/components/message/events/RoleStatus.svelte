<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		role: string;
		added: boolean;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { role, added, viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} />
{added ? "added" : "removed"}
<Username user={viewer.user} /> as a {role}.
