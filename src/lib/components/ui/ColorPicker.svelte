<script lang="ts">
	import {
		ColorPicker,
		ColorPickerArea,
		ColorPickerAreaThumb,
		ColorPickerInput,
		ColorPickerSlider,
		ColorPickerSliderThumb,
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

	const thumb = cn(
		"absolute size-3 -translate-1/2 rounded-full border-2 border-white bg-(--color-picker-color) shadow-[0_0_0_1px_rgb(0_0_0/45%)]",
		"outline-0 outline-offset-1 outline-focus outline-solid has-[:focus-visible]:outline-[1.5px] focus-visible:outline-[1.5px]",
	);
</script>

<ColorPicker
	class={cn("grid w-full gap-2.5", className)}
	format="hex"
	aria-label={ariaLabel}
	{...rest}
	bind:value
>
	<ColorPickerArea
		class="relative aspect-4/3 w-full cursor-crosshair touch-none rounded-control border border-line bg-(image:--color-area-background)"
	>
		<ColorPickerAreaThumb class={thumb} />
	</ColorPickerArea>

	<ColorPickerSlider
		channel="hue"
		class="relative h-2.5 w-full cursor-ew-resize touch-none rounded-full bg-(image:--color-slider-background)"
	>
		<ColorPickerSliderThumb class={cn(thumb, "top-1/2")} />
	</ColorPickerSlider>

	<ColorPickerInput
		class="control-field h-control-sm font-mono text-2xs uppercase"
		aria-label="Hex"
		spellcheck="false"
	/>
</ColorPicker>
