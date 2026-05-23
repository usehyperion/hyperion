<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { cn } from "$lib/util.js";
	import type { WithoutChildrenOrChild } from "$lib/util.js";
	import ChevronDownIcon from "~icons/ph/caret-down";

	let {
		ref = $bindable(null),
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props();
</script>

<SelectPrimitive.ScrollDownButton
	bind:ref
	data-slot="select-scroll-down-button"
	class={cn("flex cursor-default items-center justify-center py-1", className)}
	{...restProps}
>
	<ChevronDownIcon class="size-4" />
</SelectPrimitive.ScrollDownButton>
