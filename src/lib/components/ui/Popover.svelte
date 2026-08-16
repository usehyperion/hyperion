<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		id: string;
		side?: "top" | "right" | "bottom" | "left";
		align?: "center" | "start" | "end";
	}

	let {
		id,
		class: className,
		side = "top",
		align = "center",
		ref = $bindable(null),
		children,
		...rest
	}: Props = $props();

	const anchorName = $derived(`--popover-${id}`);
	const selfAnchorName = $derived(`--popover-self-${id}`);

	$effect(() => {
		const trigger =
			document.querySelector(`[popovertarget="${id}"]`) ?? ref?.previousElementSibling;
		if (!(trigger instanceof HTMLElement)) return;

		trigger.style.setProperty("anchor-name", anchorName);

		return () => trigger.style.removeProperty("anchor-name");
	});
</script>

<div
	{id}
	class={cn(
		"w-max rounded-xl bg-popover p-4 text-popover-foreground smooth-shadow-ring-md",
		"scale-95 opacity-0 transition-[opacity,scale,overlay,display] transition-discrete",
		className,
	)}
	popover="auto"
	data-component="popover"
	data-anchored
	data-side={side}
	data-align={align}
	style:--anchor={anchorName}
	style:--anchor-self={selfAnchorName}
	{...rest}
	bind:this={ref}
>
	{@render children?.()}
</div>

<style>
	[data-component="popover"]:popover-open {
		opacity: 1;
		scale: 1;

		@starting-style {
			opacity: 0;
			scale: 0.95;
		}
	}
</style>
