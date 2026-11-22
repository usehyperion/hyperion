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
	data-slot="empty-content"
	class={cn(
		"flex w-full max-w-xs min-w-0 flex-col items-center gap-3 text-ui text-balance",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
