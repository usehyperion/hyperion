<script lang="ts" module>
	import { createTooltipController } from "@ui-sdk/svelte/tooltip";

	export const hintTooltip = createTooltipController<string>();
</script>

<script lang="ts">
	import { Tooltip, TooltipContent, type TooltipContentState } from "@ui-sdk/svelte/tooltip";

	import { tooltipContentClass } from "./Tooltip.svelte";
</script>

<!-- One tooltip for small repeated triggers like badges and message actions, so
each message doesn't mount its own. -->
<Tooltip controller={hintTooltip} delay={300}>
	<TooltipContent class={tooltipContentClass} sideOffset={6} collisionPadding={6}>
		{#snippet children(state: TooltipContentState<string>)}{state.payload ?? ""}{/snippet}
	</TooltipContent>
</Tooltip>
