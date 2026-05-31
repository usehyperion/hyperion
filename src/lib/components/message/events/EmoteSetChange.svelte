<script lang="ts">
	import type { Viewer } from "$lib/models/viewer.svelte";
	import { colorizeName } from "$lib/util";

	interface Props {
		name?: string;
		actor: Viewer;
	}

	const { name, actor }: Props = $props();
</script>

{@html colorizeName(actor)}

{#if name}
	changed the active emote set to
	<span class="font-medium text-foreground">{name}</span>.
{:else}
	disabled the channel's emote set.
{/if}
