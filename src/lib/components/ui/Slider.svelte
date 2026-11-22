<script lang="ts">
	import {
		Slider,
		SliderControl,
		SliderIndicator,
		SliderThumb,
		SliderTrack,
		SliderValue,
	} from "@ui-sdk/svelte/slider";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
		value?: number;
		min?: number;
		max?: number;
		disabled?: boolean;
		readOnly?: boolean;
		name?: string;
		step?: number | number[];
		type?: "single";
		showSteps?: boolean;
		showValue?: boolean;
		formatValue?: (value: number) => string;
		label?: string;
	}

	let {
		class: className,
		value = $bindable(),
		min = 0,
		max = 100,
		step = 1,
		type: _type,
		showSteps = false,
		showValue = true,
		formatValue,
		label,
		...rest
	}: Props = $props();

	const stops = $derived(
		Array.isArray(step) ? [...new Set(step)].toSorted((a, b) => a - b) : null,
	);

	const bounds = $derived(
		stops ? { min: 0, max: stops.length - 1, step: 1 } : { min, max, step: step as number },
	);

	const tickCount = $derived(
		stops
			? stops.length
			: showSteps
				? Math.floor((bounds.max - bounds.min) / bounds.step) + 1
				: 0,
	);

	function nearestStop(target: number, list: number[]) {
		let best = 0;

		for (let i = 1; i < list.length; i++) {
			if (Math.abs(list[i] - target) < Math.abs(list[best] - target)) best = i;
		}

		return best;
	}

	function display(position: number) {
		const actual = stops ? stops[position] : position;
		return formatValue?.(actual) ?? String(actual);
	}

	function read() {
		if (value === undefined) return bounds.min;
		return stops ? nearestStop(value, stops) : value;
	}

	function write(next: number | number[]) {
		const position = Array.isArray(next) ? next[0] : next;
		value = stops ? stops[position] : position;
	}
</script>

<Slider
	class={cn(
		"flex w-full touch-none items-center gap-3 select-none data-disabled:opacity-50",
		className,
	)}
	min={bounds.min}
	max={bounds.max}
	step={bounds.step}
	format={display}
	{...rest}
	bind:value={read, write}
>
	<SliderControl
		class="relative flex h-4 min-w-0 flex-1 cursor-pointer items-center data-disabled:cursor-not-allowed"
	>
		<SliderTrack class="relative h-0.75 w-full rounded-full bg-surface-3">
			<SliderIndicator class="h-full rounded-full bg-fg-muted" />

			{#if tickCount > 1 && tickCount <= 50}
				<div
					class="pointer-events-none absolute inset-0 flex items-center justify-between"
					aria-hidden="true"
				>
					{#each { length: tickCount }, index (index)}
						<span class="size-0.5 rounded-full bg-fg-faint"></span>
					{/each}
				</div>
			{/if}

			<SliderThumb
				class={cn(
					"top-1/2 size-3 -translate-1/2 rounded-full bg-fg shadow-raised transition-[scale] duration-100",
					"outline-0 outline-offset-1 outline-focus outline-solid has-focus-visible:outline-[1.5px]",
					"data-dragging:scale-110",
				)}
				aria-label={label}
			/>
		</SliderTrack>
	</SliderControl>

	{#if showValue}
		<SliderValue
			class="inline-grid shrink-0 text-right font-mono text-2xs text-fg-muted tabular-nums"
		>
			{#snippet children(state)}
				<span
					class="invisible col-start-1 row-start-1 whitespace-nowrap"
					aria-hidden="true"
				>
					{display(bounds.max)}
				</span>
				<span class="col-start-1 row-start-1 whitespace-nowrap">{state.text}</span>
			{/snippet}
		</SliderValue>
	{/if}
</Slider>
