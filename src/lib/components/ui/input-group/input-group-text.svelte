<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	import { type WithElementRef } from "#lib/util/index.js";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLSpanElement>> = $props();
</script>

<span
	bind:this={ref}
	class={cn(
		"flex items-center gap-1.5 text-2xs text-fg-muted [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</span>
