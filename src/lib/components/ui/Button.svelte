<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";

	const emphasis = [
		"relative overflow-hidden text-white",
		"[--btn-ring:color-mix(in_oklch,var(--btn-token),black_10%)]",
		"[--btn-bg:color-mix(in_oklch,var(--btn-token),white_30%)]",
		"[--btn-from:color-mix(in_oklch,var(--btn-token),white_15%)]",
		"[--btn-to:var(--btn-token)]",
		"bg-(--btn-bg) ring ring-(--btn-ring)",
		"focus:ring-(--btn-ring) focus-visible:ring-(--btn-ring) active:ring-(--btn-ring)",
	];

	export const buttonVariants = tv({
		base: [
			"group inline-flex w-max shrink-0 items-center justify-center",
			"font-medium whitespace-nowrap no-underline select-none",
			"cursor-pointer border-0 shadow-xs",
			"transition-[background-color,color,box-shadow] duration-100 ease-out-quart",

			"focus:ring-ring/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
			"aria-invalid:ring-2 aria-invalid:ring-destructive",

			"disabled:cursor-not-allowed disabled:text-muted-foreground disabled:opacity-50",
			"aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
			"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
		],
		variants: {
			size: {
				default: "h-9 gap-1.5 rounded-lg px-3 text-base",
				sm: "h-7 gap-1 rounded-md px-2 text-xs",
				lg: "h-10 gap-2 rounded-lg px-4 text-base",
				icon: "size-9 items-center justify-center rounded-lg p-0",
				"icon-sm": "size-6.5 items-center justify-center rounded-md p-0",
				"icon-lg": "size-10 items-center justify-center rounded-lg p-0",
			},
			variant: {
				default: [...emphasis, "[--btn-token:var(--color-orange-500)]"],
				destructive: [...emphasis, "[--btn-token:var(--color-destructive)]"],
				secondary: [
					"bg-background text-foreground ring ring-border",
					"not-disabled:hover:bg-muted",
					"disabled:bg-background/50 disabled:text-foreground/70",
					"data-[state=open]:bg-background",
				],
				outline: [
					"bg-muted/40 text-muted-foreground ring ring-border",
					"not-disabled:hover:text-foreground not-disabled:hover:ring-ring/25",
				],
				ghost: "bg-inherit text-foreground shadow-none hover:bg-muted",
				inline: [
					"h-auto rounded-xs px-0 py-0 align-baseline font-semibold shadow-none",
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

	export const isEmphasisVariant = (variant: ButtonVariant): boolean =>
		variant === "default" || variant === "destructive";

	export const emphasisOverlayClass =
		"absolute inset-0 rounded-[inherit] bg-linear-to-b from-(--btn-from) to-(--btn-to) shadow-[inset_0_1px_0_0_var(--btn-bg)] group-hover:from-(--btn-bg)";
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util";

	interface Props extends WithElementRef<HTMLButtonAttributes> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		onclickwait?: (event: MouseEvent) => Promise<unknown>;
	}

	let {
		class: className,
		variant = "default",
		size = "default",
		type = "button",
		disabled,
		ref = $bindable(null),
		onclick,
		onclickwait,
		children,
		...rest
	}: Props = $props();

	let pending = $state(false);
</script>

<button
	class={cn(buttonVariants({ variant, size }), className)}
	{type}
	disabled={disabled || pending}
	aria-busy={pending || undefined}
	data-component="button"
	onclick={async (event) => {
		if (!onclickwait) {
			onclick?.(event);
			return;
		}

		pending = true;

		try {
			await onclickwait(event);
		} finally {
			pending = false;
		}
	}}
	bind:this={ref}
	{...rest}
>
	{#if isEmphasisVariant(variant)}
		<span class={emphasisOverlayClass} aria-hidden="true"></span>

		<span class="relative flex items-center gap-1.5">
			{@render children?.()}
		</span>
	{:else}
		{@render children?.()}
	{/if}
</button>
