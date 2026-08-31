<script lang="ts">
	import Username from "$lib/components/user/Username.svelte";
	import type { Viewer } from "$lib/models/viewer.svelte";

	interface Props {
		name?: string;
		actor: Viewer;
	}

	const { name, actor }: Props = $props();
</script>

<Username user={actor.user} />

{#if name}
	changed the active emote set to
	<span class="font-medium text-foreground">{name}</span>.
{:else}
	disabled the channel's emote set.
{/if}
