<script lang="ts">
	import { InputClear, InputGroup, type TextControlProps } from "@ui-sdk/svelte/input";
	import type { Snippet } from "svelte";
	import type { HTMLInputAttributes } from "svelte/elements";

	import { IconClear } from "#lib/icons.js";
	import { type ClassValue, cn, tv } from "#lib/util/styles.js";

	import Input from "./Input.svelte";

	const group = tv({
		base: [
			"group/input-group control-field relative w-full cursor-text gap-0 px-0",
			"has-[[aria-invalid=true]]:border-danger",
		],
		variants: {
			size: {
				sm: "h-control-sm",
				default: "h-control",
				lg: "h-control-lg",
			},
		},
		defaultVariants: { size: "default" },
	});

	type BaseProps = Omit<HTMLInputAttributes, "value" | "defaultValue" | "size"> &
		TextControlProps;

	interface Props extends BaseProps {
		size?: "sm" | "default" | "lg";
		clearable?: boolean;
		clearLabel?: string;
		inputClass?: ClassValue;
		start?: Snippet;
		end?: Snippet;
		ref?: HTMLInputElement | null;
		groupRef?: HTMLDivElement | null;
	}

	let {
		class: className,
		inputClass,
		size = "default",
		clearable = false,
		clearLabel = "Clear",
		start,
		end,
		value = $bindable(),
		ref = $bindable(null),
		groupRef = $bindable(null),
		...rest
	}: Props = $props();

	const affix =
		"flex h-full shrink-0 items-center gap-0.5 text-fg-muted [&>svg:not([class*='size-'])]:size-3.5";
</script>

<!-- ui-sdk's group registers with agents as its own input, so it carries the input's name. -->
<InputGroup class={cn(group({ size }), className)}>
	{#snippet render({ props })}
		<div {...props} role="group" aria-label={rest["aria-label"]} bind:this={groupRef}>
			{#if start}
				<span class={cn(affix, "ps-2")} data-slot="input-group-start">
					{@render start()}
				</span>
			{/if}

			<Input
				class={cn("h-full flex-1 self-stretch px-2", start && "ps-1.5", inputClass)}
				bare
				{...rest}
				bind:value
				bind:ref
			/>

			{#if clearable}
				<InputClear
					class="me-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-sm text-fg-muted control-focus hover:bg-surface-3 hover:text-fg [&_svg]:size-3"
					aria-label={clearLabel}
				>
					<IconClear aria-hidden="true" />
				</InputClear>
			{/if}

			{#if end}
				<span class={cn(affix, "pe-1")} data-slot="input-group-end">{@render end()}</span>
			{/if}
		</div>
	{/snippet}
</InputGroup>
