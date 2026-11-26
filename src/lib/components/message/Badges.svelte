<script lang="ts">
	import { TooltipTrigger } from "@ui-sdk/svelte/tooltip";

	import type { Badge } from "#lib/models/badge.js";

	import { getHintTooltip } from "../ui/HintTooltip.svelte";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();

	const tooltip = getHintTooltip();
</script>

{#each badges as badge, i (badge.id)}
	<TooltipTrigger controller={tooltip} payload={badge.title}>
		{#snippet render({ props })}
			<!-- Badges stay out of the tab order, as they did as plain images -->
			{@const { tabindex: _tabindex, type: _type, ...triggerProps } = props}

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
				{...triggerProps}
			/>
		{/snippet}
	</TooltipTrigger>
{/each}
