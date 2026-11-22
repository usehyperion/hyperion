<script lang="ts">
	import { Separator } from "@ui-sdk/svelte/separator";
	import type { HTMLAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
		orientation?: "horizontal" | "vertical";
		decorative?: boolean;
		ref?: HTMLElement | null;
		"data-slot"?: string;
	}

	let {
		class: className,
		ref = $bindable(null),
		"data-slot": dataSlot,
		...rest
	}: Props = $props();
</script>

<Separator
	class={cn(
		"shrink-0 bg-line data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
		className,
	)}
	{...rest}
>
	{#snippet render({ props })}
		<!-- Wrappers like ButtonGroup.Separator restyle by their own slot, which ui-sdk would otherwise replace. -->
		<div {...props} data-slot={dataSlot ?? props["data-slot"]} bind:this={ref}></div>
	{/snippet}
</Separator>
