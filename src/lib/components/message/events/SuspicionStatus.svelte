<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		active: boolean;
		previous: "monitoring" | "restricting" | null;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { active, previous, viewer, moderator }: Props = $props();

	const monitored = $derived(viewer.monitored);
	const restricted = $derived(viewer.restricted);
</script>

<Username user={moderator.user} />
{active ? "started" : "stopped"}
{monitored ? "monitoring" : restricted ? "restricting" : previous}
<Username user={viewer.user} />'s messages.
