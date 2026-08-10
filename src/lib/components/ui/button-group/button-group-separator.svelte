<script lang="ts">
	import type { ComponentProps } from "svelte";
	import { cn } from "tailwind-variants";
	import Separator from "$lib/components/ui/Separator.svelte";

	let {
		ref = $bindable(null),
		class: className,
		orientation = "vertical",
		...restProps
	}: ComponentProps<typeof Separator> = $props();
</script>

<Separator
	bind:ref
	data-slot="button-group-separator"
	{orientation}
	class={cn("relative !m-0 self-stretch bg-input data-[orientation=vertical]:h-auto", className)}
	{...restProps}
/>
