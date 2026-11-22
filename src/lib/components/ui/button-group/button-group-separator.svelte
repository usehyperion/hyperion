<script lang="ts">
	import type { ComponentProps } from "svelte";

	import Separator from "#lib/components/ui/Separator.svelte";
	import { cn } from "#lib/util/styles.js";

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
	class={cn(
		"relative !m-0 self-stretch bg-line-strong data-[orientation=vertical]:h-auto",
		className,
	)}
	{...restProps}
/>
