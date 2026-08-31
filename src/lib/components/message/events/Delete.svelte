<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		text: string;
		user: User;
		moderator?: Viewer;
	}

	const { text, user, moderator }: Props = $props();
</script>

{#if moderator}
	<Username user={moderator.user} /> deleted <Username {user} />'s message: {text}
{:else}
	<Username {user} />'s message was deleted: {text}
{/if}
