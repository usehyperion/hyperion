<script lang="ts">
	import { Slider } from "bits-ui";
	import { cn } from "tailwind-variants";
	import { clamp, type WithoutChildrenOrChild } from "$lib/util";

	const THUMB_SIZE = 20;
	const TRACK_INSET = 1;
	const TOOLTIP_DELAY = 100;

	type ValuePosition = "left" | "right" | "top" | "bottom" | "tooltip";

	type Props = WithoutChildrenOrChild<Slider.RootProps> & {
		showSteps?: boolean;
		showValue?: boolean;
		valuePosition?: ValuePosition;
		formatValue?: (value: number) => string;
		label?: string;
		trackClass?: string;
		fillClass?: string;
		thumbClass?: string;
	};

	let {
		class: className,
		trackClass,
		fillClass,
		thumbClass,
		min,
		max,
		step,
		orientation = "horizontal",
		disabled,
		showSteps = false,
		showValue = true,
		valuePosition = "left",
		formatValue,
		label,
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: Props = $props();

	const stepValues = $derived(
		Array.isArray(step) ? [...new Set(step)].toSorted((a, b) => a - b) : null,
	);
	const stepSize = $derived(typeof step === "number" ? step : 1);

	const lowerBound = $derived(min ?? stepValues?.at(0) ?? 0);
	const upperBound = $derived(max ?? stepValues?.at(-1) ?? 100);

	const isHorizontal = $derived(orientation === "horizontal");
	const isInline = $derived(valuePosition === "left" || valuePosition === "right");
	const isLeading = $derived(valuePosition === "left" || valuePosition === "top");

	let dragging = $state(false);
	let hovered = $state(false);
	let tooltipDelayElapsed = $state(false);
	let preview = $state<{ start: number; size: number; center: number; value: number }>();

	const interacting = $derived(hovered || dragging);
	const previewVisible = $derived(hovered && !dragging && preview !== undefined);
	const tooltipVisible = $derived(previewVisible && tooltipDelayElapsed);

	const values = $derived(Array.isArray(value) ? value : [value ?? lowerBound]);
	const valueText = $derived(values.map(display).join(" — "));

	/**
	 * Reserves the width of the widest value the slider can show, so the track
	 * doesn't jitter as digits are gained and lost.
	 */
	const widestValueText = $derived(
		(label ? `${label}: ` : "") +
			(values.length > 1
				? `${display(upperBound)} — ${display(upperBound)}`
				: display(upperBound)),
	);

	function display(value: number) {
		return formatValue?.(value) ?? String(value);
	}

	function thumbLabel(index: number) {
		if (values.length === 1) return label;
		if (!label) return index === 0 ? "Minimum" : "Maximum";

		return index === 0 ? `${label} minimum` : `${label} maximum`;
	}

	function snap(value: number) {
		if (stepValues) {
			return stepValues.reduce((a, b) => (Math.abs(b - value) < Math.abs(a - value) ? b : a));
		}

		const snapped = Math.round((value - lowerBound) / stepSize) * stepSize + lowerBound;

		return clamp(lowerBound, snapped, upperBound);
	}

	function ratio(value: number) {
		return upperBound === lowerBound ? 0 : (value - lowerBound) / (upperBound - lowerBound);
	}

	/**
	 * Tracks the value the pointer would commit to, so the track can preview the
	 * jump as a bar reaching out from the nearest thumb towards the cursor.
	 */
	function previewValueAt(event: PointerEvent) {
		if (disabled || dragging || !isHorizontal || !ref) return;

		const rect = ref.getBoundingClientRect();
		const width = ref.offsetWidth;
		if (width <= 0 || rect.width <= 0) return;

		// Normalise the cursor into layout space so the pixel constants below still
		// hold when an ancestor applies a CSS transform.
		const scale = rect.width / width;
		const usable = width - THUMB_SIZE;
		const local = clamp(0, (event.clientX - rect.left) / scale - THUMB_SIZE / 2, usable);
		const raw =
			usable > 0 ? (local / usable) * (upperBound - lowerBound) + lowerBound : lowerBound;
		const target = snap(raw);

		const center = THUMB_SIZE / 2 + ratio(target) * usable;

		// Run the bar into the rounded cap at either extreme so it leaves no gap.
		const edge = target === lowerBound ? 0 : target === upperBound ? width : center;
		const thumb = values
			.map((value) => THUMB_SIZE / 2 + ratio(value) * usable)
			.reduce((a, b) => (Math.abs(center - b) < Math.abs(center - a) ? b : a));

		preview = {
			start: Math.min(thumb, edge),
			size: Math.abs(edge - thumb),
			center,
			value: target,
		};
	}

	$effect(() => {
		if (!hovered) {
			tooltipDelayElapsed = false;
			return;
		}

		const timeout = setTimeout(() => (tooltipDelayElapsed = true), TOOLTIP_DELAY);

		return () => clearTimeout(timeout);
	});

	$effect(() => {
		if (!dragging) return;

		// The committed value has moved, so the preview is stale — drop it and let
		// the next pointer move recompute from the thumb's new position.
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
</script>

<div
	class={cn(
		"flex w-full touch-none select-none",
		isInline ? "flex-row items-center gap-2" : "flex-col",
		disabled && "pointer-events-none opacity-50",
		className,
	)}
	data-slot="slider-container"
>
	{#if showValue && valuePosition !== "tooltip" && isLeading}
		{@render valueDisplay()}
	{/if}

	<Slider.Root
		class={cn(
			"relative flex touch-none items-center select-none",
			isHorizontal
				? cn("h-9", isInline ? "min-w-0 flex-1" : "w-full")
				: "min-h-44 w-9 flex-col justify-center",
			isHorizontal && !disabled && "cursor-ew-resize",
		)}
		{min}
		{max}
		{step}
		{orientation}
		{disabled}
		data-slot="slider"
		onpointerdown={() => !disabled && (dragging = true)}
		onpointerenter={() => (hovered = true)}
		onpointerleave={() => (hovered = false)}
		onpointermove={previewValueAt}
		bind:value={value as never}
		bind:ref
		{...rest}
	>
		{#snippet children({ tickItems, thumbItems })}
			<span
				class={cn(
					"pointer-events-none absolute overflow-hidden rounded-full border border-input",
					isHorizontal ? "inset-x-px h-4.5" : "inset-y-px w-4.5",
					trackClass,
				)}
				data-orientation={orientation}
				data-slot="slider-track"
			>
				<Slider.Range
					class={cn(
						"absolute bg-foreground/10 duration-300 ease-out-quint",
						isHorizontal ? "h-full" : "w-full",
						dragging ? "transition-none" : "transition-[top,right,bottom,left]",
						fillClass,
					)}
					data-slot="slider-range"
				/>

				{#if isHorizontal}
					<span
						class={cn(
							"absolute h-full bg-foreground/20 transition-opacity duration-150",
							previewVisible ? "opacity-100" : "opacity-0",
						)}
						style:left="{(preview?.start ?? 0) - TRACK_INSET}px"
						style:width="{preview?.size ?? 0}px"
						style:border-radius={(preview?.center ?? 0) > (preview?.start ?? 0)
							? "0 9999px 9999px 0"
							: "9999px 0 0 9999px"}
						aria-hidden="true"
					></span>
				{/if}
			</span>

			{#if showSteps || Array.isArray(step)}
				{#each tickItems as tick (tick.index)}
					<Slider.Tick
						class={cn(
							"z-1 size-1 rounded-full bg-muted-foreground/40 transition-[scale,opacity] duration-200 data-bounded:opacity-0",
							isHorizontal ? "top-[calc(50%-2px)]" : "left-[calc(50%-2px)]",
							hovered && "scale-125",
						)}
						index={tick.index}
					/>
				{/each}
			{/if}

			{#each thumbItems as thumb (thumb.index)}
				<Slider.Thumb
					class={cn(
						"z-2 flex size-5 shrink-0 items-center justify-center rounded-full outline-hidden duration-300 ease-out-quint",
						"focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ring",
						dragging ? "transition-none" : "transition-[top,bottom,left]",
					)}
					index={thumb.index}
					aria-label={thumbLabel(thumb.index)}
					data-slot="slider-thumb"
				>
					<span
						class={cn(
							"size-4 rounded-full bg-background shadow-sm dark:bg-foreground",
							thumbClass,
						)}
					></span>
				</Slider.Thumb>

				{#if showValue && valuePosition === "tooltip"}
					<Slider.ThumbLabel
						class={cn(
							"duration-300 ease-out-quint",
							dragging ? "transition-none" : "transition-[left]",
						)}
						index={thumb.index}
						position="top"
					>
						{@render tooltip(display(thumb.value), interacting)}
					</Slider.ThumbLabel>
				{/if}
			{/each}

			{#if isHorizontal && preview && valuePosition !== "tooltip"}
				<span
					class="pointer-events-none absolute bottom-full z-10"
					style:left="{preview.center}px"
					style:translate="-50% 0"
					aria-hidden="true"
				>
					{@render tooltip(display(preview.value), tooltipVisible)}
				</span>
			{/if}
		{/snippet}
	</Slider.Root>

	{#if showValue && valuePosition !== "tooltip" && !isLeading}
		{@render valueDisplay()}
	{/if}
</div>

{#snippet valueDisplay()}
	<span
		class={cn(
			"inline-grid shrink-0 text-xs leading-none text-muted-foreground tabular-nums",
			interacting && "font-medium",
		)}
		data-slot="slider-value"
	>
		<span
			class="invisible col-start-1 row-start-1 font-medium whitespace-nowrap"
			aria-hidden="true"
		>
			{widestValueText}
		</span>

		<span class="col-start-1 row-start-1 whitespace-nowrap">
			{label ? `${label}: ${valueText}` : valueText}
		</span>
	</span>
{/snippet}

{#snippet tooltip(text: string, visible: boolean)}
	<span
		class={cn(
			"pointer-events-none mb-1 block rounded-md bg-foreground px-2 py-1 text-xs font-medium whitespace-nowrap text-background tabular-nums transition-[opacity,translate] duration-150",
			visible ? "opacity-100" : "translate-y-1 opacity-0",
		)}
	>
		{text}
	</span>
{/snippet}
