<script lang="ts" module>
	import { createTooltipController, type TooltipController } from "@ui-sdk/svelte/tooltip";
	import { createContext } from "svelte";

	export const [getHintTooltip, setHintTooltip] = createContext<TooltipController<string>>();

	export function provideHintTooltip() {
		return setHintTooltip(createTooltipController<string>());
	}
</script>

<script lang="ts">
	import { Tooltip, TooltipContent, type TooltipContentState } from "@ui-sdk/svelte/tooltip";

	import { tooltipContentClass } from "./Tooltip.svelte";

	interface Props {
		controller: TooltipController<string>;
	}

	const { controller }: Props = $props();
</script>

<!-- One tooltip per window for small repeated triggers like badges and message
actions, so each message doesn't mount its own. -->
<Tooltip {controller} delay={300}>
	<TooltipContent class={tooltipContentClass} sideOffset={6} collisionPadding={6}>
		{#snippet children(state: TooltipContentState<string>)}{state.payload ?? ""}{/snippet}
	</TooltipContent>
</Tooltip>
