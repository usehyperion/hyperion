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
	data-slot="field-title"
	class={cn(
		"flex w-fit items-center gap-2 text-ui leading-snug font-medium group-data-disabled/field:opacity-50",
		className,
	)}
	{...restProps}
>
	{@render children?.()}
</div>
