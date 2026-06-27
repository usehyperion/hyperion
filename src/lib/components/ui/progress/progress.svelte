<script lang="ts">
	import { Progress as ProgressPrimitive } from "bits-ui";
	import { cn } from "$lib/util.js";
	import type { WithoutChildrenOrChild } from "$lib/util.js";

	interface Props extends WithoutChildrenOrChild<ProgressPrimitive.RootProps> {
		indicatorClass?: string;
	}

	let {
		ref = $bindable(null),
		class: className,
		indicatorClass,
		max = 100,
		value,
		...restProps
	}: Props = $props();
</script>

<ProgressPrimitive.Root
	bind:ref
	data-slot="progress"
	class={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
	{value}
	{max}
	{...restProps}
>
	<div
		data-slot="progress-indicator"
		class={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClass)}
		style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
	></div>
</ProgressPrimitive.Root>
