<script lang="ts">
	import type { Badge } from "$lib/models/badge";
	import Tooltip from "../ui/Tooltip.svelte";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();
</script>

{#each badges as badge (badge.id)}
	<img
		class={["inline-block align-middle", badge.color && "rounded-xs"]}
		src={badge.imageUrl}
		alt={badge.description}
		width="18"
		height="18"
		data-slot="tooltip-trigger"
		style:background-color={badge.color}
	/>

	<Tooltip class="p-1 text-xs" side="top">
		{badge.title}
	</Tooltip>
{/each}
