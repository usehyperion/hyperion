<script lang="ts" module>
	import { type VariantProps, tv } from "#lib/util/styles.js";

	export const buttonVariants = tv({
		base: [
			"inline-flex w-max shrink-0 items-center justify-center",
			"font-medium whitespace-nowrap no-underline select-none",
			"cursor-pointer control-focus",
			"transition-[background-color,border-color,color] duration-100 ease-out-quart",
			"disabled:cursor-not-allowed disabled:opacity-50",
			"data-disabled:cursor-not-allowed data-disabled:opacity-50",
			"data-pending:cursor-progress",
			"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
		],
		variants: {
			size: {
				default: "h-control gap-1.5 rounded-control px-2.5 text-body",
				sm: "h-control-sm gap-1 rounded-[5px] px-2 text-caption",
				lg: "h-control-lg gap-1.5 rounded-control px-3 text-body",
				icon: "size-control rounded-control",
				"icon-sm": "size-control-sm rounded-[5px]",
				"icon-lg": "size-control-lg rounded-control",
				none: "",
			},
			variant: {
				default: "bg-fg text-fg-inverse not-disabled:not-aria-disabled:hover:bg-fg/88",
				destructive: [
					"border border-danger/35 bg-danger/12 text-danger",
					"not-disabled:not-aria-disabled:hover:border-danger/55 not-disabled:not-aria-disabled:hover:bg-danger/20",
				],
				secondary: [
					"border border-line-strong bg-surface-2 text-fg shadow-raised",
					"not-disabled:not-aria-disabled:hover:bg-surface-3",
				],
				outline: [
					"border border-line text-fg-muted",
					"not-disabled:not-aria-disabled:hover:border-line-strong not-disabled:not-aria-disabled:hover:bg-surface-2 not-disabled:not-aria-disabled:hover:text-fg",
				],
				ghost: [
					"text-fg-muted",
					"not-disabled:not-aria-disabled:hover:bg-surface-3 not-disabled:not-aria-disabled:hover:text-fg",
					"aria-expanded:bg-surface-3 aria-expanded:text-fg data-open:bg-surface-3 data-open:text-fg",
				],
				inline: [
					"h-auto rounded-xs p-0 align-baseline font-semibold",
					"underline decoration-dotted decoration-from-font underline-offset-[3px]",
					"hover:decoration-solid",
				],
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];
</script>

<script lang="ts">
	import { type ButtonActionDetails, Button, type ButtonOptions } from "@ui-sdk/svelte/button";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	type BaseProps = Omit<HTMLButtonAttributes, "type" | "disabled" | "onclick"> & ButtonOptions;

	interface Props extends BaseProps {
		variant?: ButtonVariant;
		size?: ButtonSize;
		onclick?: (event: MouseEvent, details: ButtonActionDetails) => unknown;
		ref?: HTMLButtonElement | null;
	}

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		children,
		...rest
	}: Props = $props();
</script>

<Button
	class={cn(
		buttonVariants({
			variant,
			size: variant === "inline" ? "none" : size,
		}),
		className,
	)}
	{...rest}
>
	{#snippet render({ props })}
		<button {...props} bind:this={ref}>{@render children?.()}</button>
	{/snippet}
</Button>
