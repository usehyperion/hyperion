<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn } from "$lib/util.js";
	import type { WithoutChildrenOrChild } from "$lib/util.js";

	type Props = WithoutChildrenOrChild<SliderPrimitive.RootProps> & {
		thumbLabel?: string;
		tickLabel?: string;
	};

	let {
		class: className,
		step,
		orientation = "horizontal",
		thumbLabel,
		tickLabel,
		ref = $bindable(null),
		value = $bindable(),
		...restProps
	}: Props = $props();
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
	class={cn(
		"relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
		typeof step === "number" && "mb-4",
		className,
	)}
	{step}
	{orientation}
	data-slot="slider"
	bind:value={value as never}
	bind:ref
	{...restProps}
>
	{#snippet children({ tickItems })}
		<span
			class={cn(
				"relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
			)}
			data-orientation={orientation}
			data-slot="slider-track"
		>
			<SliderPrimitive.Range
				class={cn(
					"absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
				)}
				data-slot="slider-range"
			/>
		</span>

		<SliderPrimitive.Thumb
			class="z-3 block size-4 shrink-0 rounded-full border border-input bg-primary shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
			index={0}
			data-slot="slider-thumb"
		/>

		{#if typeof step === "number"}
			<SliderPrimitive.ThumbLabel
				class="mt-3 bg-popover text-xs font-medium"
				index={0}
				position="bottom"
			>
				{thumbLabel?.replace("{value}", String(value)) ?? value}
			</SliderPrimitive.ThumbLabel>
		{/if}

		{#if typeof step !== "number"}
			{#each tickItems as tick (tick.index)}
				<SliderPrimitive.Tick
					class="z-1 h-2 w-px rounded bg-background"
					index={tick.index}
				/>

				<SliderPrimitive.TickLabel
					class="mt-4 text-xs font-medium text-muted-foreground transition-colors data-selected:text-foreground"
					index={tick.index}
					position="bottom"
				>
					{tickLabel?.replace("{value}", String(tick.value)) ?? tick.value}
				</SliderPrimitive.TickLabel>
			{/each}
		{/if}
	{/snippet}
</SliderPrimitive.Root>
