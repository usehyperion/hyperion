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

	import { clamp } from "#lib/util/math.js";
	import { type ClassValue, cn } from "#lib/util/styles.js";

	import { tooltipSurfaceClass } from "./Tooltip.svelte";

	const THUMB_INSET = 10;
	const TOOLTIP_DELAY = 100;

	interface Preview {
		start: number;
		size: number;
		center: number;
		position: number;
		before: boolean;
	}

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
		value?: number;
		min?: number;
		max?: number;
		disabled?: boolean;
		readOnly?: boolean;
		name?: string;
		step?: number | number[];
		showSteps?: boolean;
		showValue?: boolean;
		formatValue?: (value: number) => string;
		label?: string;
		trackClass?: ClassValue;
		fillClass?: ClassValue;
		thumbClass?: ClassValue;
	}

	let {
		class: className,
		value = $bindable(),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		showSteps = false,
		showValue = true,
		formatValue,
		label,
		trackClass,
		fillClass,
		thumbClass,
		...rest
	}: Props = $props();

	let rail = $state<HTMLElement | null>(null);
	let hovered = $state(false);
	let dragging = $state(false);
	let delayElapsed = $state(false);
	let preview = $state<Preview>();

	const stops = $derived(
		Array.isArray(step) ? [...new Set(step)].toSorted((a, b) => a - b) : null,
	);

	const bounds = $derived(
		stops ? { min: 0, max: stops.length - 1, step: 1 } : { min, max, step: step as number },
	);

	const position = $derived.by(() => {
		if (value === undefined) {
			return bounds.min;
		}

		return stops ? nearestStop(value, stops) : value;
	});

	const tickCount = $derived(
		stops || showSteps ? Math.floor((bounds.max - bounds.min) / bounds.step) + 1 : 0,
	);

	const interacting = $derived(hovered || dragging);
	const previewVisible = $derived(hovered && !dragging && preview !== undefined);
	const tooltipVisible = $derived(previewVisible && delayElapsed);
	const readout = $derived(label ? `${label}: ${display(position)}` : display(position));
	const widestReadout = $derived(
		label ? `${label}: ${display(bounds.max)}` : display(bounds.max),
	);

	$effect(() => {
		if (!hovered) {
			delayElapsed = false;
			return;
		}

		const timeout = setTimeout(() => (delayElapsed = true), TOOLTIP_DELAY);

		return () => clearTimeout(timeout);
	});

	$effect(() => {
		if (!dragging) return;

		const stop = () => {
			dragging = false;
			preview = undefined;
		};

		window.addEventListener("pointerup", stop);
		window.addEventListener("pointercancel", stop);

		return () => {
			window.removeEventListener("pointerup", stop);
			window.removeEventListener("pointercancel", stop);
		};
	});

	function nearestStop(target: number, list: number[]) {
		let best = 0;

		for (let i = 1; i < list.length; i++) {
			if (Math.abs(list[i] - target) < Math.abs(list[best] - target)) {
				best = i;
			}
		}

		return best;
	}

	function display(at: number) {
		const actual = stops ? stops[at] : at;
		return formatValue?.(actual) ?? String(actual);
	}

	function write(next: number | number[]) {
		const at = Array.isArray(next) ? next[0] : next;
		value = stops ? stops[at] : at;
	}

	function ratio(at: number) {
		return bounds.max === bounds.min ? 0 : (at - bounds.min) / (bounds.max - bounds.min);
	}

	function snap(raw: number) {
		const snapped = Math.round((raw - bounds.min) / bounds.step) * bounds.step + bounds.min;
		return clamp(bounds.min, snapped, bounds.max);
	}

	// Measures in layout pixels so a transformed ancestor (like an opening
	// dialog) doesn't skew the preview.
	function previewAt(event: PointerEvent) {
		if (disabled || dragging || !rail) return;

		const rect = rail.getBoundingClientRect();
		const width = rail.offsetWidth;

		if (width <= 0 || rect.width <= 0) return;

		const local = clamp(0, (event.clientX - rect.left) / (rect.width / width), width);
		const target = snap(bounds.min + (local / width) * (bounds.max - bounds.min));
		const center = ratio(target) * width;
		const thumb = ratio(position) * width;

		// Run into the rounded cap at either end so the bar leaves no gap.
		const edge =
			target === bounds.min
				? -(THUMB_INSET - 1)
				: target === bounds.max
					? width + THUMB_INSET - 1
					: center;

		preview = {
			start: Math.min(thumb, edge),
			size: Math.abs(edge - thumb),
			center,
			position: target,
			before: edge < thumb,
		};
	}
</script>

<Slider
	class={cn(
		"group/slider flex w-full touch-none items-center gap-2 select-none data-disabled:opacity-50",
		className,
	)}
	min={bounds.min}
	max={bounds.max}
	step={bounds.step}
	format={display}
	{disabled}
	{...rest}
	bind:value={() => position, write}
>
	<SliderControl
		class="relative flex h-9 min-w-0 flex-1 cursor-ew-resize items-center data-disabled:cursor-not-allowed"
		onpointerdown={() => !disabled && (dragging = true)}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => {
			hovered = false;
			preview = undefined;
		}}
		onpointermove={previewAt}
	>
		<span
			class={cn(
				"pointer-events-none absolute inset-x-0 h-4.5 rounded-full border border-line-strong",
				trackClass,
			)}
			aria-hidden="true"
		></span>

		<SliderTrack class="relative mx-2.5 h-4 flex-1">
			{#snippet render({ props, children, state })}
				<div {...props} bind:this={rail}>
					{@render children?.(state)}
				</div>
			{/snippet}

			<SliderIndicator
				class={cn(
					"-ms-2.25 box-content h-full rounded-s-full bg-fg/10 ps-2.25 duration-300 ease-out-quint",
					dragging ? "transition-none" : "transition-[left,width]",
					fillClass,
				)}
			/>

			<span
				class={cn(
					"pointer-events-none absolute h-full bg-fg/20 transition-opacity duration-150",
					previewVisible ? "opacity-100" : "opacity-0",
					preview?.before ? "rounded-s-full" : "rounded-e-full",
				)}
				style:left="{preview?.start ?? 0}px"
				style:width="{preview?.size ?? 0}px"
				aria-hidden="true"
			></span>

			{#if tickCount > 2 && tickCount <= 100}
				{#each { length: tickCount - 2 }, index (index)}
					<span
						class={cn(
							"pointer-events-none absolute top-1/2 size-1 -translate-1/2 rounded-full bg-fg-muted/40 transition-[scale] duration-200",
							hovered && "scale-125",
						)}
						style:left="{((index + 1) / (tickCount - 1)) * 100}%"
						aria-hidden="true"
					></span>
				{/each}
			{/if}

			<SliderThumb
				class={cn(
					"top-1/2 z-2 flex size-5 -translate-1/2 items-center justify-center rounded-full duration-300 ease-out-quint",
					"outline-0 outline-offset-2 outline-focus outline-solid has-focus-visible:outline-[1.5px]",
					dragging ? "transition-none" : "transition-[left]",
				)}
				aria-label={label}
			>
				{#snippet render({ props, children, state })}
					<div {...props}>
						{@render children?.(state)}

						<span
							class={cn(
								"size-4 rounded-full bg-surface-1 shadow-sm dark:bg-fg",
								thumbClass,
							)}
						></span>
					</div>
				{/snippet}
			</SliderThumb>

			{#if preview}
				<span
					class="pointer-events-none absolute bottom-full z-10 -translate-x-1/2"
					style:left="{preview.center}px"
					aria-hidden="true"
				>
					{@render tooltip(display(preview.position), tooltipVisible)}
				</span>
			{/if}
		</SliderTrack>
	</SliderControl>

	{#if showValue}
		<SliderValue
			class={cn(
				"inline-grid shrink-0 text-xs leading-none text-fg-muted tabular-nums",
				interacting && "font-medium",
			)}
		>
			<span
				class="invisible col-start-1 row-start-1 font-medium whitespace-nowrap"
				aria-hidden="true"
			>
				{widestReadout}
			</span>
			<span class="col-start-1 row-start-1 whitespace-nowrap">{readout}</span>
		</SliderValue>
	{/if}
</Slider>

{#snippet tooltip(text: string, visible: boolean)}
	<span
		class={cn(
			tooltipSurfaceClass,
			"mb-1.5 block origin-bottom whitespace-nowrap tabular-nums transition-[opacity,scale] duration-100 ease-out",
			visible ? "opacity-100" : "scale-95 opacity-0",
		)}
	>
		{text}
	</span>
{/snippet}
