<script lang="ts">
	import { Button } from "@ui-sdk/svelte/button";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	import { type ButtonSize, type ButtonVariant, buttonVariants } from "./Button.svelte";

	interface Props extends HTMLAnchorAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
		ref?: HTMLAnchorElement | null;
	}

	let {
		class: className,
		variant = "default",
		size = "default",
		ref = $bindable(null),
		href,
		target,
		rel,
		disabled = false,
		children,
		...rest
	}: Props = $props();

	const external = $derived(href?.startsWith("http") ?? false);
	const resolvedSize = $derived(variant === "inline" ? "none" : size);
</script>

<Button {disabled}>
	{#snippet render({ props })}
		<a
			{...rest}
			{href}
			target={target ?? (external ? "_blank" : undefined)}
			rel={rel ?? (external ? "noreferrer" : undefined)}
			data-bare
			data-variant={variant}
			data-size={resolvedSize}
			{...props}
			class={cn(buttonVariants({ variant, size: resolvedSize }), className)}
			bind:this={ref}
		>
			{@render children?.()}
		</a>
	{/snippet}
</Button>
