<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { WarnMetadata } from "$lib/twitch/eventsub";

	interface Props {
		warning: WarnMetadata;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { warning, viewer, moderator }: Props = $props();

	const reasons = $derived(
		[warning.reason, ...(warning.chat_rules_cited ?? [])].filter((r) => r !== null).join(", "),
	);
</script>

<Username user={moderator.user} /> warned <Username user={viewer.user} />: {reasons}
