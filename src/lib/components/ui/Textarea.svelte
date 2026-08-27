<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import { type WithElementRef, type WithoutChildren } from "$lib/util";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		"flex field-sizing-content min-h-16 w-full rounded-lg border border-border-strong bg-field px-2.5 py-2 text-base transition-colors outline-none placeholder:text-foreground-placeholder focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-field-disabled disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20 md:text-sm",
		className,
	)}
	bind:value
	{...restProps}></textarea>
