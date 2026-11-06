<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";

	interface Props {
		active: boolean;
		treatment: "monitoring" | "restricting";
		viewer: Viewer;
		moderator: Viewer;
	}

	const { active, treatment, viewer, moderator }: Props = $props();
</script>

<Username user={moderator.user} />
{active ? "started" : "stopped"}
{treatment}
<Username user={viewer.user} />'s messages.
