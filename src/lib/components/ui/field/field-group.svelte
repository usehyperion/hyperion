<script lang="ts">
	import { FieldGroup } from "@ui-sdk/svelte/field";
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

<FieldGroup
	class={cn(
		"group/field-group @container/field-group flex w-full flex-col gap-4 *:data-[slot=field-group]:gap-3",
		className,
	)}
	{...restProps}
>
	{#snippet render({ props })}
		<div {...props} bind:this={ref}>{@render children?.()}</div>
	{/snippet}
</FieldGroup>
