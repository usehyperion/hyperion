<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		banned: boolean;
		reason: string | null;
		viewer: Viewer;
		moderator?: Viewer;
	}

	const { banned, reason, viewer, moderator }: Props = $props();

	const action = $derived(banned ? "banned" : "unbanned");
</script>

{#if moderator}
	<Username user={moderator.user} /> {action} <Username user={viewer.user} />
{:else}
	<Username user={viewer.user} /> has been {action}
{/if}{reason ? `: ${reason}` : "."}
