<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		side?: "top" | "right" | "bottom" | "left";
		align?: "center" | "start" | "end";
		delay?: number;
	}

	let {
		class: className,
		side = "top",
		align = "center",
		delay = 300,
		ref = $bindable(null),
		children,
		...rest
	}: Props = $props();

	const id = $props.id();

	const anchorName = `--tooltip-${id}`;
	const selfAnchorName = `--tooltip-self-${id}`;

	$effect(() => {
		const trigger = ref?.previousElementSibling;
		if (!(trigger instanceof HTMLElement)) return;

		trigger.style.setProperty("anchor-name", anchorName);

		return () => trigger.style.removeProperty("anchor-name");
	});
</script>

<div
	class={cn(
		"pointer-events-none z-50 w-max rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-primary opacity-0 smooth-shadow-ring-md transition-[opacity,scale] delay-0",
		className,
	)}
	role="tooltip"
	data-component="tooltip"
	data-anchored
	data-arrow
	data-side={side}
	data-align={align}
	style:--tooltip-delay="{delay}ms"
	style:--anchor={anchorName}
	style:--anchor-self={selfAnchorName}
	{...rest}
	bind:this={ref}
>
	{@render children?.()}
</div>

<style>
	:global([data-slot="tooltip-trigger"]:hover) + [data-component="tooltip"] {
		opacity: 1;
		pointer-events: auto;
		transition-delay: var(--tooltip-delay);
	}
</style>
