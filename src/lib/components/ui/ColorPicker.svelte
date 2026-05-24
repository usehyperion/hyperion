<script lang="ts">
	import { Slider } from "bits-ui";
	import chroma from "chroma-js";
	import type { HTMLAttributes } from "svelte/elements";
	import { clamp, cn } from "$lib/util";
	import { Input } from "./input";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value?: chroma.ChromaInput;
	}

	let { class: className, value = $bindable(), ...rest }: Props = $props();

	const color = $state(chroma(value ?? "#FFFFFF"));
	const hsv = color.hsv();

	let h = $state(hsv[0] || 0);
	let s = $state(hsv[1] * 100 || 100);
	let v = $state(hsv[2] * 100 || 50);

	let well = $state<HTMLElement>();
	let isDragging = $state(false);

	const position = $derived({ x: s, y: 100 - v });
	const hex = $derived(chroma.hsv(h, s / 100, v / 100).hex());

	$effect(() => {
		value = hex;
	});

	$effect(() => {
		if (isDragging) {
			addEventListener("pointermove", handlePointerMove);
			addEventListener("pointerup", () => (isDragging = false));
		}

		return () => {
			removeEventListener("pointermove", handlePointerMove);
			removeEventListener("pointerup", () => (isDragging = false));
		};
	});

	function handlePointerMove(event: PointerEvent) {
		if (!isDragging || !well) return;

		const rect = well.getBoundingClientRect();

		const x = clamp(0, event.clientX - rect.left, rect.width);
		const y = clamp(0, event.clientY - rect.top, rect.height);

		s = clamp(0, x / rect.width, 1) * 100;
		v = clamp(0, (rect.height - y) / rect.height, 1) * 100;
	}

	function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
		const hsv = chroma(event.currentTarget.value).hsv();

		h = hsv[0];
		s = hsv[1] * 100;
		v = hsv[2] * 100;
	}
</script>

<div class={cn("grid w-full gap-4", className)} {...rest}>
	<div
		id="color-picker-well"
		class="relative aspect-4/3 w-full cursor-crosshair rounded-md border border-muted"
		style:--color-picker-well-hue={h}
		role="group"
		onpointerdown={(event) => {
			event.preventDefault();

			isDragging = true;
			handlePointerMove(event);
		}}
		bind:this={well}
	>
		<div
			class="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
			style:top="{position.y}%"
			style:left="{position.x}%"
			style:box-shadow="0 0 0 2px rgb(0 0 0 / 50%)"
		></div>
	</div>

	<Slider.Root
		class="relative flex h-3 w-full items-center"
		type="single"
		step={1}
		max={360}
		bind:value={h}
	>
		<div id="color-picker-hue" class="relative my-0.5 h-2 w-full grow rounded-full">
			<Slider.Range class="absolute w-full" />
		</div>

		<Slider.Thumb
			class="block h-4 w-2 cursor-ew-resize rounded-sm border bg-primary shadow transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none active:cursor-ew-resize"
			index={0}
		/>
	</Slider.Root>

	<Input class="text-xs uppercase shadow-none" type="text" value={hex} onchange={handleChange} />
</div>

<style>
	#color-picker-well {
		background:
			linear-gradient(0deg, #000, transparent),
			linear-gradient(90deg, #fff, hsl(var(--color-picker-well-hue), 100%, 50%));
	}

	#color-picker-hue {
		background: linear-gradient(
			90deg,
			#ff0000,
			#ffff00,
			#00ff00,
			#00ffff,
			#0000ff,
			#ff00ff,
			#ff0000
		);
	}
</style>
