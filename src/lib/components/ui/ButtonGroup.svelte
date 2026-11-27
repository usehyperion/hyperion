<script lang="ts" module>
	import type { Component } from "svelte";
	import type { SvelteHTMLElements } from "svelte/elements";

	export interface ButtonGroupItem {
		label: string;
		icon?: Component<SvelteHTMLElements["svg"]>;
		disabled?: boolean;
		onclick?: (event: MouseEvent) => void;
	}
</script>

<script lang="ts">
	import { Toolbar, ToolbarButton, type ToolbarOrientation } from "@ui-sdk/svelte/toolbar";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	import { type ButtonVariant, buttonVariants } from "./Button.svelte";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		"aria-label": string;
		items?: ButtonGroupItem[];
		variant?: Exclude<ButtonVariant, "inline">;
		size?: "sm" | "default" | "lg";
		orientation?: ToolbarOrientation;
		loop?: boolean;
		disabled?: boolean;
	}

	const {
		class: className,
		items = [],
		variant = "ghost",
		size = "default",
		orientation = "horizontal",
		loop,
		disabled,
		children,
		...rest
	}: Props = $props();

	const iconSizes = { sm: "icon-sm", default: "icon", lg: "icon-lg" } as const;
</script>

<Toolbar
	class={cn("flex w-fit items-center gap-0.5 vertical:flex-col", className)}
	{orientation}
	{loop}
	{disabled}
	{...rest}
>
	{#each items as item (item.label)}
		{@const itemSize = item.icon ? iconSizes[size] : size}

		<ToolbarButton
			title={item.icon ? item.label : undefined}
			class={buttonVariants({ variant, size: itemSize })}
			disabled={item.disabled}
			aria-label={item.icon ? item.label : undefined}
			data-variant={variant}
			data-size={itemSize}
			onclick={item.onclick}
		>
			{#if item.icon}
				<item.icon aria-hidden="true" />
			{:else}
				{item.label}
			{/if}
		</ToolbarButton>
	{/each}

	{@render children?.()}
</Toolbar>
