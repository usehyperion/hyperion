<script lang="ts">
	import { FieldSet } from "@ui-sdk/svelte/field";
	import type { HTMLFieldsetAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLFieldsetAttributes> = $props();
</script>

<FieldSet
	class={cn("flex min-w-0 flex-col gap-3", className)}
	{...restProps}
	disabled={restProps.disabled ?? undefined}
>
	{#snippet render({ props })}
		<fieldset {...props} bind:this={ref}>{@render children?.()}</fieldset>
	{/snippet}
</FieldSet>
