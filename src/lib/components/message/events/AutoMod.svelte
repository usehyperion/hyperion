<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import type { AutoModMessageStatus } from "$lib/twitch/eventsub";

	interface Props {
		status: AutoModMessageStatus;
		viewer: Viewer;
		moderator: Viewer;
	}

	const { status, viewer, moderator }: Props = $props();
</script>

{#if status === "expired"}
	<Username user={viewer.user} />'s message expired and was not shown in chat.
{:else}
	<Username user={moderator.user} /> {status} <Username user={viewer.user} />'s message.
{/if}
