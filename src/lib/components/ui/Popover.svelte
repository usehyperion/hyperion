<script lang="ts">
	import {
		Popover,
		PopoverContent,
		type PopoverController,
		type PopoverInitialFocus,
		PopoverTrigger,
	} from "@ui-sdk/svelte/popover";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		controller?: PopoverController;
		anchor?: HTMLElement | null;
		container?: Element | null;
		side?: "top" | "right" | "bottom" | "left";
		align?: "center" | "start" | "end";
		sideOffset?: number;
		initialFocus?: PopoverInitialFocus;
		trigger?: Snippet<[props: Record<string, unknown>]>;
		onOpenChange?: (open: boolean) => void;
		onOpenChangeComplete?: (open: boolean) => void;
	}

	const {
		controller,
		anchor,
		container,
		side = "top",
		align = "center",
		sideOffset = 6,
		initialFocus,
		class: className,
		trigger,
		children,
		onOpenChange,
		onOpenChangeComplete,
		...rest
	}: Props = $props();
</script>

<Popover {controller} {onOpenChange} {onOpenChangeComplete}>
	{#if trigger}
		<PopoverTrigger>
			{#snippet render({ props })}
				{@render trigger(props)}
			{/snippet}
		</PopoverTrigger>
	{/if}

	<PopoverContent
		class={cn(
			"popup-surface m-0 max-h-(--available-height) max-w-[calc(100vw-1rem)] overflow-y-auto p-3 outline-none",
			className,
		)}
		{anchor}
		{container}
		{side}
		{align}
		{sideOffset}
		collisionPadding={8}
		{initialFocus}
		{...rest}
	>
		{#snippet render({ props })}
			<!-- ui-sdk keeps aria-labelledby on the trigger, which outranks a passed aria-label. -->
			<div
				{...props}
				aria-labelledby={rest["aria-label"]
					? undefined
					: (props["aria-labelledby"] as string)}
			>
				{@render children?.()}
			</div>
		{/snippet}
	</PopoverContent>
</Popover>
