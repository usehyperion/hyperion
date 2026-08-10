<script lang="ts">
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util";
	import { type ButtonSize, type ButtonVariant, buttonVariants } from "./button-variants";

	interface Props extends WithElementRef<HTMLButtonAttributes> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** Disables the button while the handler is in flight. */
		onclickwait?: (event: MouseEvent) => Promise<unknown>;
	}

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		type = "button",
		disabled,
		children,
		onclick,
		onclickwait,
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
	{@render children?.()}
</button>
