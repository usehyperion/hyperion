<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

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
