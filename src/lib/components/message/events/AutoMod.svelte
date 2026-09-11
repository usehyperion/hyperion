<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		status: string;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { status, viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} />
{status}
<Username user={viewer.user} />'s message.
