<script lang="ts">
	import { SegmentedControl, SegmentedControlIndicator } from "@ui-sdk/svelte/segmented-control";
	import type { ComponentProps } from "svelte";

	import { cn } from "#lib/util/styles.js";

	interface Props extends ComponentProps<typeof SegmentedControl> {
		size?: "sm" | "default";
	}

	let {
		class: className,
		value = $bindable(),
		size = "default",
		children: content,
		...rest
	}: Props = $props();
</script>

<SegmentedControl
	class={cn(
		"relative isolate inline-flex shrink-0 control-track p-0.5 data-disabled:opacity-50 data-[orientation=vertical]:h-auto data-[orientation=vertical]:flex-col",
		size === "sm" ? "h-control-sm" : "h-control",
		className,
	)}
	data-size={size}
	bind:value
	{...rest}
>
	{#snippet children(state)}
		<SegmentedControlIndicator
			class="absolute top-(--segmented-control-indicator-top) left-(--segmented-control-indicator-left) -z-1 h-(--segmented-control-indicator-height) w-(--segmented-control-indicator-width) rounded-[5px] control-raised transition-[top,left,width,height] duration-200 ease-out-quart motion-reduce:transition-none"
		/>

		{@render content?.(state)}
	{/snippet}
</SegmentedControl>
