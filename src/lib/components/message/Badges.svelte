<script lang="ts">
	import type { Badge } from "$lib/models/badge";

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
		data-tooltip="compact"
		data-tooltip-text={badge.title}
		style:background-color={badge.color}
	/>
{/each}
