<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util";

	type Props = WithElementRef<HTMLInputAttributes>;

	let {
		class: className,
		type = "text",
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<input
	class={cn(
		"flex h-9 w-full min-w-0 rounded-lg border border-border-strong bg-field px-3 py-1 text-sm shadow-xs ring-offset-surface transition-[color,box-shadow] outline-none selection:bg-selection placeholder:text-foreground-placeholder disabled:cursor-not-allowed disabled:opacity-50",
		"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
		"aria-invalid:border-danger aria-invalid:ring-danger/20 dark:aria-invalid:ring-danger/40",
		className,
	)}
	{type}
	data-component="input"
	{...rest}
	bind:value
	bind:this={ref}
/>
