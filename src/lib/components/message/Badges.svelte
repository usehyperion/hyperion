<script lang="ts">
	import { Tooltip } from "bits-ui";
	import type { Badge } from "$lib/models/badge";

	interface Props {
		badges: Badge[];
	}

	const { badges }: Props = $props();

	const badgeTether = Tooltip.createTether<Badge>();
</script>

<Tooltip.Root tether={badgeTether}>
	{#snippet children({ payload })}
		{#each badges as badge, i (badge.id)}
			<Tooltip.Trigger tether={badgeTether} payload={badge}>
				{#snippet child({ props })}
					<!-- Omit props expected to go on a button for a11y -->
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
			</Tooltip.Trigger>
		{/each}

		<Tooltip.Portal>
			<Tooltip.Content class="p-1" sideOffset={6}>
				<Tooltip.Arrow class="text-surface-tooltip" />
				{payload?.title}
			</Tooltip.Content>
		</Tooltip.Portal>
	{/snippet}
</Tooltip.Root>
