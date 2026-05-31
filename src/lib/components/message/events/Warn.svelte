<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { WarnMetadata } from "$lib/twitch/eventsub";
	import { colorizeName } from "$lib/util";

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

{@html colorizeName(moderator)} warned {@html colorizeName(viewer)}: {reasons}
