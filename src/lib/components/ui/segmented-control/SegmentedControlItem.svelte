<script lang="ts">
	import { SegmentedControlItem } from "@ui-sdk/svelte/segmented-control";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	const { class: className, ...rest }: ComponentProps<typeof SegmentedControlItem> = $props();
</script>

<SegmentedControlItem
	class={cn(
		"inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-[5px] px-2.5 text-ui font-medium whitespace-nowrap text-fg-muted control-focus transition-colors select-none hover:text-fg data-checked:text-fg data-disabled:pointer-events-none data-disabled:opacity-40 [&_svg]:size-3.5 [&_svg]:shrink-0",
		className,
	)}
	{...rest}
/>
