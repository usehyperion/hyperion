<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util";

	let {
		class: className,
		checked = $bindable(false),
		ref = $bindable(null),
		...rest
	}: WithElementRef<HTMLInputAttributes> = $props();
</script>

<input
	class={cn(
		"peer relative inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer appearance-none items-center rounded-full border border-transparent shadow-xs transition-[background-color,box-shadow] outline-none",
		"bg-input checked:bg-orange-500 dark:bg-input/80",
		"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
		"disabled:cursor-not-allowed disabled:opacity-50",

		// Thumb
		"before:pointer-events-none before:block before:size-4 before:translate-x-0 before:rounded-full before:bg-background before:ring-0 before:transition-transform",
		"checked:before:translate-x-[calc(100%-2px)]",
		"dark:before:bg-foreground dark:checked:before:bg-primary",
		className,
	)}
	type="checkbox"
	role="switch"
	data-component="switch"
	{...rest}
	bind:checked
	bind:this={ref}
/>
