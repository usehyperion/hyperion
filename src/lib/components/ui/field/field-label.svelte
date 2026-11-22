<script lang="ts">
	import { FieldLabel } from "@ui-sdk/svelte/field";
	import type { HTMLLabelAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLLabelAttributes, HTMLLabelElement> = $props();
</script>

<FieldLabel
	class={cn(
		"flex w-fit items-center gap-2 text-ui leading-snug font-medium text-fg select-none",
		"data-disabled:opacity-50 data-invalid:text-danger",
		className,
	)}
	{...restProps}
>
	{#snippet render({ props })}
		<label {...props} bind:this={ref}>{@render children?.()}</label>
	{/snippet}
</FieldLabel>
