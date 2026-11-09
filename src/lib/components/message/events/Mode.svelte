<script lang="ts">
	import type { Viewer } from "#lib/models/viewer.svelte.js";

	import Username from "#lib/components/user/Username.svelte";
	import { formatDuration } from "#lib/util/time.js";

	interface Props {
		mode: "emote-only" | "unique-mode" | "subscriber-only" | "follower-only" | "slow";
		enabled: boolean;

		seconds?: number;
		moderator: Viewer;
	}

	const { mode, enabled, seconds, moderator }: Props = $props();
</script>

<Username user={moderator.user} />
{enabled ? "enabled" : "disabled"}
{seconds === undefined ? "" : formatDuration(seconds)}
{mode === "slow" ? "slow mode." : `${mode} chat.`}
