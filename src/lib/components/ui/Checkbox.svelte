<script lang="ts">
	import { Checkbox } from "bits-ui";
	import type { WithoutChildrenOrChild } from "bits-ui";
	import { cn } from "cnfast";
	import CheckIcon from "~icons/ph/check";
	import MinusIcon from "~icons/ph/minus";

	let {
		class: className,
		checked = $bindable(false),
		indeterminate = $bindable(false),
		ref = $bindable(null),
		...rest
	}: WithoutChildrenOrChild<Checkbox.RootProps> = $props();
</script>

<Checkbox.Root
	class={cn(
		"peer flex size-4 shrink-0 items-center justify-center rounded-sm border border-input shadow-xs transition-shadow outline-none",
		"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
		"aria-invalid:border-destructive aria-invalid:ring-destructive/20",
		"data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
		"dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary",
		className,
	)}
	data-component="checkbox"
	{...rest}
	bind:checked
	bind:indeterminate
	bind:ref
>
	{#snippet children({ checked, indeterminate })}
		<div class="text-current transition-none" data-slot="checkbox-indicator">
			{#if checked}
				<CheckIcon class="size-3.5" />
			{:else if indeterminate}
				<MinusIcon class="size-3.5" />
			{/if}
		</div>
	{/snippet}
</Checkbox.Root>
