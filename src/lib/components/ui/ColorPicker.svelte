<script lang="ts">
	import {
		ColorPicker,
		ColorPickerArea,
		ColorPickerAreaThumb,
		ColorPickerInput,
		ColorPickerSlider,
		ColorPickerSliderThumb,
		ColorPickerSwatch,
	} from "@ui-sdk/svelte/color-picker";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
		value?: string;
		disabled?: boolean;
		readOnly?: boolean;
		name?: string;
	}

	let {
		class: className,
		value = $bindable("#ffffff"),
		"aria-label": ariaLabel = "Color",
		...rest
	}: Props = $props();

	// The input reads CSS colors only, so typed hex like `ff8800` needs its `#`; it
	// tracks the text from input events, so writing `value` alone isn't seen.
	function prefixHex(event: Event & { currentTarget: HTMLInputElement }) {
		if (event instanceof KeyboardEvent && event.key !== "Enter") return;

		const input = event.currentTarget;
		const text = input.value.trim();

		if (/^(?:[\da-f]{3}){1,2}$/i.test(text)) {
			input.value = `#${text}`;
			input.dispatchEvent(new Event("input", { bubbles: true }));
		}
	}

	const thumb = cn(
		"size-3 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/50%),0_1px_3px_rgb(0_0_0/40%)]",
		"outline-0 outline-offset-1 outline-focus outline-solid focus-visible:outline-[1.5px] has-focus-visible:outline-[1.5px]",
		"data-out-of-gamut:border-dashed",
	);
</script>

<ColorPicker
	class={cn("flex w-full flex-col gap-2 data-disabled:opacity-50", className)}
	format="hex"
	aria-label={ariaLabel}
	{...rest}
	bind:value
>
	<ColorPickerArea
		class="relative aspect-3/2 w-full cursor-crosshair touch-none rounded-control bg-(image:--color-area-background) shadow-[inset_0_0_0_1px_var(--color-line-strong)] data-disabled:cursor-not-allowed"
	>
		<ColorPickerAreaThumb class={cn(thumb, "-translate-1/2")} />
	</ColorPickerArea>

	<!-- A fixed strip: ui-sdk's --color-slider-background keeps the color's saturation, so it greys out. -->
	<ColorPickerSlider
		channel="hue"
		class="relative h-2.5 w-full cursor-ew-resize touch-none rounded-full bg-[linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)] shadow-[inset_0_0_0_1px_var(--color-line)] data-disabled:cursor-not-allowed"
	>
		<!-- Shifting by the thumb's own position keeps it inside the strip at 0° and 360°. -->
		<ColorPickerSliderThumb
			class={cn(
				thumb,
				"top-1/2 -translate-x-(--color-slider-thumb-position) -translate-y-1/2",
			)}
		/>
	</ColorPickerSlider>

	<div class="flex items-center gap-1.5">
		<ColorPickerSwatch
			class="size-control-sm shrink-0 rounded-[5px] bg-(--color-picker-color) shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
		/>

		<ColorPickerInput
			class="control-field h-control-sm min-w-0 flex-1 px-2 font-mono text-2xs tracking-wide uppercase tabular-nums"
			aria-label="Hex"
			spellcheck="false"
			autocomplete="off"
			onkeydown={prefixHex}
			onblur={prefixHex}
		/>
	</div>
</ColorPicker>
