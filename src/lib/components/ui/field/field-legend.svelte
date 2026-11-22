<script lang="ts">
	import { FieldLegend } from "@ui-sdk/svelte/field";
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		variant = "legend",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLLegendElement>> & {
		variant?: "legend" | "label";
	} = $props();
</script>

<FieldLegend
	data-variant={variant}
	class={cn(
		variant === "legend" ? "mb-1 section-label" : "mb-1 text-ui font-medium text-fg",
		className,
	)}
	{...restProps}
>
	{#snippet render({ props })}
		<legend {...props} bind:this={ref}>{@render children?.()}</legend>
	{/snippet}
</FieldLegend>
