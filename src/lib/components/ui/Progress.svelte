<script lang="ts">
	import { Progress, type WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "cnfast";

	interface Props extends WithoutChildrenOrChild<Progress.RootProps> {
		indicatorClass?: string;
	}

	let {
		class: className,
		indicatorClass,
		max = 100,
		value,
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<Progress.Root
	class={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
	{value}
	{max}
	data-component="progress"
	{...rest}
	bind:ref
>
	<div
		class={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClass)}
		data-slot="progress-indicator"
		style:transform="translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
	></div>
</Progress.Root>
