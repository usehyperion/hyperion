<script lang="ts">
	import { FieldDescription } from "@ui-sdk/svelte/field";
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLParagraphElement>> = $props();
</script>

<FieldDescription
	class={cn(
		"text-2xs leading-normal text-fg-muted data-disabled:opacity-50",
		"[&>a]:underline [&>a]:underline-offset-2 [&>a:hover]:text-fg",
		className,
	)}
	{...restProps}
>
	{#snippet render({ props })}
		<p {...props} bind:this={ref}>{@render children?.()}</p>
	{/snippet}
</FieldDescription>
