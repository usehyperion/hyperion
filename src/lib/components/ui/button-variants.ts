import { type VariantProps, tv } from "tailwind-variants";

/**
 * Shared recipe for `Button.svelte` (renders a `<button>`) and `Link.svelte`
 * (renders an `<a>`), so a control looks the same regardless of which element
 * it needs to be.
 *
 * Hover and press are handled once, in the base, by a tint layer that sits
 * between the control's own background and its label (`isolate` + `after:-z-10`).
 * Variants only describe their resting surface — they never redeclare a hover
 * colour — which keeps every variant reacting identically and keeps the whole
 * thing working under custom themes, since the tint is derived from
 * `--foreground` rather than hardcoded.
 */
export const buttonVariants = tv({
	base: [
		"relative isolate inline-flex shrink-0 items-center justify-center gap-2",
		"text-sm font-medium whitespace-nowrap no-underline select-none",
		"transition-[background-color,border-color,color,box-shadow,translate] duration-100 ease-out-quart",

		// Tint layer: lifts the surface toward the foreground colour on hover,
		// pushes further on press. Reads as "lighter" on dark, "darker" on light.
		"after:absolute after:inset-0 after:-z-10 after:rounded-[inherit]",
		"after:transition-[background-color] after:duration-100 after:ease-out-quart",
		"hover:after:bg-foreground/10 active:after:bg-foreground/15",

		// Press: the control sinks a hair. Filled variants also swap their drop
		// shadow for an inset one, so the whole thing reads as a key travelling.
		"active:translate-y-px",

		"outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
		"aria-invalid:outline-solid aria-invalid:outline-2 aria-invalid:outline-destructive",

		"disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40",
		"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	],
	variants: {
		// Declared before `variant` on purpose: tailwind-merge resolves conflicts
		// in favour of the class that appears last, and `inline` needs to strip
		// the box geometry a size would otherwise impose.
		size: {
			default: "h-9 rounded-xl px-4 has-[>svg]:px-3.5",
			sm: "h-8 gap-1.5 rounded-lg px-3 has-[>svg]:px-2.5",
			lg: "h-11 rounded-xl px-6 text-base has-[>svg]:px-5",
			icon: "size-9 rounded-lg",
			"icon-sm": "size-8 rounded-lg",
			"icon-lg": "size-10 rounded-xl",
		},
		variant: {
			default: [
				"bg-orange-500 text-white",
				"shadow-[0_1px_2px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.38)]",
				"active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.28)]",
			],
			destructive: [
				"bg-destructive text-white",
				"shadow-[0_1px_2px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.18)]",
				"active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.28)]",
			],
			secondary: [
				"bg-secondary text-secondary-foreground",
				"shadow-[0_1px_2px_rgb(0_0_0/0.12),inset_0_1px_0_rgb(255_255_255/0.6)]",
				"dark:shadow-[0_1px_2px_rgb(0_0_0/0.4),inset_0_1px_0_rgb(255_255_255/0.07)]",
				"active:shadow-[inset_0_1px_2px_rgb(0_0_0/0.16)]",
			],
			outline: "border border-border bg-transparent text-foreground active:shadow-none",
			ghost: "bg-transparent text-foreground",
			// A button living inside a run of prose. Dotted underline so it stays
			// distinguishable from a real hyperlink, which the app underlines solid.
			inline: [
				"h-auto rounded-xs px-0 py-0 align-baseline font-semibold",
				"underline decoration-dotted decoration-from-font underline-offset-[3px]",
				"hover:decoration-solid",
				"after:hidden active:translate-y-0",
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
