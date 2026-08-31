<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

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
