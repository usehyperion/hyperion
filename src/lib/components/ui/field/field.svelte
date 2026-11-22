<script lang="ts" module>
	import type { VariantProps } from "#lib/util/styles.js";

	import { tv } from "#lib/util/styles.js";

	export const fieldVariants = tv({
		base: "group/field flex w-full gap-1.5",
		variants: {
			orientation: {
				vertical: "flex-col [&>:not([popover],[data-slot=button],.sr-only)]:w-full",
				horizontal: [
					"flex-row items-center",
					"[&>[data-slot=field-label]]:flex-auto",
					"gap-3 has-[>[data-slot=field-content]]:items-start",
				],
				responsive: [
					"flex-col @md/field-group:flex-row @md/field-group:items-center [&>:not([popover],[data-slot=button],.sr-only)]:w-full @md/field-group:[&>:not([popover],[data-slot=button])]:w-auto",
					"@md/field-group:[&>[data-slot=field-label]]:flex-auto",
					"@md/field-group:gap-3 @md/field-group:has-[>[data-slot=field-content]]:items-start",
				],
			},
		},
		defaultVariants: {
			orientation: "vertical",
		},
	});

	export type FieldOrientation = VariantProps<typeof fieldVariants>["orientation"];
</script>

<script lang="ts">
	import { Field } from "@ui-sdk/svelte/field";
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		orientation = "vertical",
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: FieldOrientation;
	} = $props();
</script>

<Field
	data-orientation={orientation}
	class={cn(fieldVariants({ orientation }), className)}
	{...restProps}
>
	{#snippet render({ props })}
		<div {...props} bind:this={ref}>{@render children?.()}</div>
	{/snippet}
</Field>
