<script lang="ts">
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import type { WithElementRef } from "$lib/util";
	import {
		type ButtonSize,
		type ButtonVariant,
		buttonVariants,
		emphasisOverlayClass,
		isEmphasisVariant,
	} from "./Button.svelte";

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

<a
	class={cn(buttonVariants({ variant, size }), className)}
	href={disabled ? undefined : href}
	target={target ?? (external ? "_blank" : undefined)}
	rel={rel ?? (external ? "noreferrer" : undefined)}
	role={disabled ? "link" : undefined}
	tabindex={disabled ? -1 : undefined}
	aria-disabled={disabled || undefined}
	data-component="link"
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
</a>
