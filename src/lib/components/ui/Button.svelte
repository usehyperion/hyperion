<script lang="ts" module>
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";
	import type { VariantProps } from "tailwind-variants";
	import { tv } from "tailwind-variants/lite";
	import { cn } from "$lib/util";
	import type { WithElementRef } from "$lib/util";

	export const buttonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-30 aria-disabled:pointer-events-none aria-disabled:opacity-30 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
				destructive:
					"bg-destructive shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white",
				outline:
					"bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border",
				secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
				lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
				icon: "size-9",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	export type ButtonProps = (WithElementRef<HTMLButtonAttributes> & {
		onclickwait?: (event: MouseEvent) => Promise<any>;
	}) &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		onclick,
		onclickwait,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		target={href.startsWith("http") ? "_blank" : undefined}
		tabindex={disabled ? -1 : undefined}
		role={disabled ? "link" : undefined}
		aria-disabled={disabled}
		data-slot="button"
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		data-slot="button"
		onclick={async (event) => {
			if (onclickwait) {
				disabled = true;
				await onclickwait(event);
				disabled = false;
			} else {
				onclick?.(event);
			}
		}}
		bind:this={ref}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
