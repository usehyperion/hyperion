<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="empty-description"
	class={cn(
		"text-2xs/relaxed text-fg-muted [&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-fg",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
