<script lang="ts" module>
	import { tv, type VariantProps } from "#lib/util/styles.js";

	export const inputGroupAddonVariants = tv({
		base: "flex h-full shrink-0 cursor-text items-center justify-center gap-1.5 text-2xs font-medium text-fg-muted select-none group-data-disabled/input-group:opacity-50 [&>kbd]:rounded-[4px] [&>svg:not([class*='size-'])]:size-3.5",
		variants: {
			align: {
				"inline-start": "order-first ps-2 has-[>button]:ps-0.5",
				"inline-end": "order-last pe-2 has-[>button]:pe-0.5",
				"block-start": "order-first h-auto w-full justify-start px-2 pt-1.5",
				"block-end": "order-last h-auto w-full justify-start px-2 pb-1.5",
			},
		},
		defaultVariants: {
			align: "inline-start",
		},
	});

	export type InputGroupAddonAlign = VariantProps<typeof inputGroupAddonVariants>["align"];
</script>

<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	import { type WithElementRef } from "#lib/util/index.js";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		align = "inline-start",
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		align?: InputGroupAddonAlign;
	} = $props();
</script>

<div
	bind:this={ref}
	role="group"
	data-slot="input-group-addon"
	data-align={align}
	class={cn(inputGroupAddonVariants({ align }), className)}
	onclick={(e) => {
		if ((e.target as HTMLElement).closest("button")) {
			return;
		}
		e.currentTarget.parentElement?.querySelector("input")?.focus();
	}}
	{...restProps}
>
	{@render children?.()}
</div>
