<script lang="ts">
	import type { Badge } from "$lib/models/badge";
	import Tooltip from "../ui/Tooltip.svelte";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();
</script>

{#each badges as badge (badge.id)}
	<Tooltip class="p-1">
		{#snippet trigger(register)}
			<img
				class={["inline-block align-middle", badge.color && "rounded-xs"]}
				src={badge.imageUrl}
				alt={badge.description}
				width="18"
				height="18"
				style:background-color={badge.color}
				{@attach register}
			/>
		{/snippet}

		{badge.title}
	</Tooltip>
{/each}
