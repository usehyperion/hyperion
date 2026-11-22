<script lang="ts" module>
	import { tv, type VariantProps } from "#lib/util/styles.js";

	const inputGroupButtonVariants = tv({
		base: "flex items-center",
		variants: {
			size: {
				xs: "h-5.5 gap-1 rounded-[4px] px-1.5 text-2xs",
				sm: "h-control-sm gap-1 rounded-[5px] px-2 text-2xs",
				"icon-xs": "size-5.5 rounded-[4px] p-0",
				"icon-sm": "size-control rounded-control p-0 [&_svg:not([class*='size-'])]:size-4",
			},
		},
		defaultVariants: {
			size: "xs",
		},
	});

	export type InputGroupButtonSize = VariantProps<typeof inputGroupButtonVariants>["size"];
</script>

<script lang="ts">
	import type { ComponentProps } from "svelte";

	import Button from "#lib/components/ui/Button.svelte";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		type = "button",
		variant = "ghost",
		size = "xs",
		...restProps
	}: Omit<ComponentProps<typeof Button>, "size"> & {
		size?: InputGroupButtonSize;
	} = $props();
</script>

<Button
	bind:ref
	{type}
	data-size={size}
	{variant}
	size="none"
	class={cn(inputGroupButtonVariants({ size }), className)}
	{...restProps}
>
	{@render children?.()}
</Button>
