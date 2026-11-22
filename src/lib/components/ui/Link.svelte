<script lang="ts">
	import { Button } from "@ui-sdk/svelte/button";
	import type { HTMLAnchorAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import { cn } from "#lib/util/styles.js";

	import { type ButtonSize, type ButtonVariant, buttonVariants } from "./Button.svelte";

	interface Props extends WithElementRef<HTMLAnchorAttributes, HTMLAnchorElement> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		disabled?: boolean;
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
</script>

<Button {disabled}>
	{#snippet render({ props })}
		<a
			{...rest}
			{href}
			target={target ?? (external ? "_blank" : undefined)}
			rel={rel ?? (external ? "noreferrer" : undefined)}
			data-bare
			{...props}
			class={cn(
				buttonVariants({ variant, size: variant === "inline" ? "none" : size }),
				className,
			)}
			bind:this={ref}
		>
			{@render children?.()}
		</a>
	{/snippet}
</Button>
