<script lang="ts">
	import type { User } from "$lib/models/user.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		text: string;
		user: User;
		moderator?: Viewer;
	}

	const { text, user, moderator }: Props = $props();

	const target = $derived(colorizeName(user));
</script>

{#if moderator}
	{@html colorizeName(moderator)} deleted {@html target}'s message: {text}
{:else}
	{@html target}'s message was deleted: {text}
{/if}
