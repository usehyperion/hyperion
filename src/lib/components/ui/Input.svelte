<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import { cn } from "$lib/util.js";
	import type { WithElementRef } from "$lib/util.js";

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
		"flex h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs ring-offset-background transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
		"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
		"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
		className,
	)}
	{type}
	data-slot="input"
	bind:value
	bind:this={ref}
	{...rest}
/>
