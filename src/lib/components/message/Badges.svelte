<script lang="ts">
	import type { Badge } from "$lib/models/badge";
	import Tooltip from "../ui/Tooltip.svelte";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();
</script>

{#each badges as badge, i (badge.id)}
	<Tooltip class="p-1">
		{#snippet trigger(props)}
			<img
				class={[
					"inline-block align-middle",
					badge.color && "rounded-xs",
					i < badges.length - 1 && "me-0.5",
				]}
				src={badge.imageUrl}
				alt={badge.description}
				width="18"
				height="18"
				style:background-color={badge.color}
				{...props}
			/>
		{/snippet}

		{badge.title}
	</Tooltip>
{/each}
