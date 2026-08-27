<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
</script>

<p
	bind:this={ref}
	data-slot="field-description"
	class={cn(
		"text-sm leading-normal font-normal text-foreground-subtle",
		"last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
		"[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</p>
