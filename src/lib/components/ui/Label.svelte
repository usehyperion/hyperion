<script lang="ts">
	import { Label } from "@ui-sdk/svelte/label";
	import type { HTMLLabelAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	interface Props extends HTMLLabelAttributes {
		ref?: HTMLLabelElement | null;
		"data-slot"?: string;
	}

	let {
		class: className,
		ref = $bindable(null),
		"data-slot": dataSlot,
		...rest
	}: Props = $props();
</script>

<Label
	class={cn(
		"flex items-center gap-2 text-ui leading-snug font-medium text-fg select-none",
		"peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50",
		"group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
		className,
	)}
	{...rest}
>
	{#snippet render({ props, state, children })}
		<!-- Wrappers like Field.Label restyle by their own slot, which ui-sdk would otherwise replace. -->
		<label {...props} data-slot={dataSlot ?? props["data-slot"]} bind:this={ref}>
			{@render children?.(state)}
		</label>
	{/snippet}
</Label>
