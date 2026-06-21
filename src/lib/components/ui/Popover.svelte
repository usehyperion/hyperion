<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		id: string;
		side?: "top" | "right" | "bottom" | "left";
		ref?: HTMLDivElement;
	}

	let {
		id,
		class: className,
		side = "top",
		ref = $bindable(),
		children,
		...rest
	}: Props = $props();
</script>

<div
	{id}
	class={className}
	popover="auto"
	data-component="popover"
	data-side={side}
	{...rest}
	bind:this={ref}
>
	{@render children?.()}
</div>
