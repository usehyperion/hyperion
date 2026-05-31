<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName, formatDuration } from "$lib/util";

	interface Props {
		mode: string;
		enabled: boolean;
		seconds: number;
		moderator: Viewer;
	}

	const { mode, enabled, seconds, moderator }: Props = $props();
</script>

{@html colorizeName(moderator)}
{enabled ? "enabled" : "disabled"}
{Number.isNaN(seconds) ? "" : formatDuration(seconds)}
{mode === "slow" ? "slow mode." : `${mode} chat.`}
