<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import { scale } from "svelte/transition";
	import { cn } from "tailwind-variants";

	import type { WithoutChildrenOrChild } from "$lib/util.js";

	let {
		class: className,
		ref = $bindable(null),
		...rest
	}: WithoutChildrenOrChild<RadioGroup.ItemProps> = $props();
</script>

<RadioGroup.Item
	class={cn(
		"group relative inline-flex size-4 shrink-0 items-center justify-center rounded-full",
		"outline-0 outline-offset-0 outline-transparent transition-[outline-width,outline-offset,outline-color] duration-150 ease-out-expo outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/50",
		"disabled:cursor-not-allowed disabled:opacity-60",
		"aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-destructive/50 aria-invalid:outline-solid",
		"border bg-input bg-clip-padding dark:bg-input/80",
		className,
	)}
	data-slot="radio-group-item"
	bind:ref
	{...rest}
>
	{#snippet children({ checked })}
		{#if checked}
			<div
				class={cn(
					"absolute -inset-px z-1 flex items-center justify-center rounded-full bg-orange-500",
					"before:size-full before:origin-center before:scale-50 before:rounded-full before:bg-background before:content-[''] dark:before:bg-primary",
				)}
				data-slot="radio-group-indicator"
				transition:scale={{ start: 0.8, duration: 250 }}
			></div>
		{/if}
	{/snippet}
</RadioGroup.Item>
