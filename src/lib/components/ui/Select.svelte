<script lang="ts">
	import type { HTMLSelectAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import CaretDown from "~icons/ph/caret-down";

	interface Option {
		label: string;
		value: string | number;
	}

	interface Props extends HTMLSelectAttributes {
		options: Option[];
		ref?: HTMLSelectElement | null;
	}

	let {
		class: className,
		options,
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<div class="relative w-full">
	<select
		class={cn(
			"h-9 w-full min-w-0 appearance-none rounded-lg border border-border-strong py-1 pr-8 pl-2.5 text-sm transition-colors outline-none select-none",
			"selection:bg-selection placeholder:text-foreground-placeholder",
			"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
			"disabled:pointer-events-none disabled:cursor-not-allowed",
			"aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
			"bg-field hover:bg-field-hover aria-invalid:border-danger/50 aria-invalid:ring-danger/40",
			className,
		)}
		bind:value
		bind:this={ref}
		{...rest}
	>
		{#each options as option}
			<option class="bg-[canvas] text-[canvastext]" value={option.value}>
				{option.label}
			</option>
		{/each}
	</select>

	<CaretDown
		class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-foreground-subtle"
		aria-hidden="true"
	/>
</div>
