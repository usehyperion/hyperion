<script lang="ts">
	import type { Badge } from "$lib/models/badge";
	import * as Tooltip from "../ui/tooltip";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();
</script>

{#each badges as badge (badge.id)}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<img
					{...props}
					class={["inline-block align-middle", badge.color && "rounded-xs"]}
					src={badge.imageUrl}
					alt={badge.description}
					width="18"
					height="18"
					style:background-color={badge.color}
				/>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content class="p-1 text-xs" side="top" sideOffset={4}>
			{badge.title}
		</Tooltip.Content>
	</Tooltip.Root>
{/each}
