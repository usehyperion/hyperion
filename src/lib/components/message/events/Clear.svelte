<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		moderator?: Viewer;
	}

	const { moderator }: Props = $props();
</script>

{#if moderator}
	<Username user={moderator.user} /> cleared the chat
{:else}
	The chat has been cleared
{/if}

for non-moderator viewers.
