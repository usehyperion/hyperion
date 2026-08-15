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
			"h-9 w-full min-w-0 appearance-none rounded-lg border border-input py-1 pr-8 pl-2.5 text-sm transition-colors outline-none select-none",
			"selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground",
			"focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
			"disabled:pointer-events-none disabled:cursor-not-allowed",
			"aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
			"dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
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
		class="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground"
		aria-hidden="true"
	/>
</div>
