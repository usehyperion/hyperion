<script lang="ts" module>
	export const tooltipSurfaceClass =
		"rounded-[5px] border border-line-strong bg-surface-3 px-1.5 py-0.5 text-2xs text-fg shadow-popup";

	export const tooltipContentClass = [
		"m-0 w-max max-w-64 overflow-visible",
		tooltipSurfaceClass,
		"origin-(--transform-origin) transition-[opacity,scale] duration-100 ease-out",
		"ending:opacity-0 starting:scale-95 starting:opacity-0 data-instant:transition-none",
	];
</script>

<script lang="ts">
	import { Tooltip, TooltipContent, TooltipTrigger } from "@ui-sdk/svelte/tooltip";
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		delay?: number;
		side?: "top" | "right" | "bottom" | "left";
		align?: "center" | "start" | "end";
		sideOffset?: number;
		type?: "label" | "description";
		children: Snippet;
		trigger: Snippet<[props: Record<string, unknown>]>;
	}

	const {
		delay = 300,
		side = "top",
		align = "center",
		sideOffset = 6,
		type,
		class: className,
		children,
		trigger,
		...rest
	}: Props = $props();
</script>

<Tooltip {delay} {type}>
	<TooltipTrigger>
		{#snippet render({ props })}
			{@render trigger(props)}
		{/snippet}
	</TooltipTrigger>

	<TooltipContent
		class={cn(tooltipContentClass, className)}
		{side}
		{align}
		{sideOffset}
		collisionPadding={6}
		{...rest}
	>
		{@render children()}
	</TooltipContent>
</Tooltip>
