<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		id: string;
		side?: "top" | "right" | "bottom" | "left";
	}

	let {
		id,
		class: className,
		side = "top",
		ref = $bindable(null),
		children,
		...rest
	}: Props = $props();

	const anchorName = $derived(`--popover-${id}`);

	$effect(() => {
		const trigger =
			ref?.previousElementSibling || document.querySelector(`[popovertarget="${id}"]`);
		if (!(trigger instanceof HTMLElement)) return;

		trigger.style.setProperty("anchor-name", anchorName);

		return () => trigger.style.removeProperty("anchor-name");
	});
</script>

<div
	{id}
	class={cn(
		"fixed inset-auto m-0 w-max rounded-xl bg-popover p-4 text-popover-foreground smooth-shadow-ring-md",
		"scale-95 opacity-0 transition-[opacity,scale,overlay,display] transition-discrete",
		className,
	)}
	popover="auto"
	data-component="popover"
	data-side={side}
	style:position-anchor={anchorName}
	{...rest}
	bind:this={ref}
>
	{@render children?.()}
</div>

<style>
	[data-component="popover"] {
		&[data-side="top"] {
			bottom: anchor(top);
			justify-self: anchor-center;
			margin-bottom: 0.5rem;
		}

		&[data-side="bottom"] {
			top: anchor(bottom);
			justify-self: anchor-center;
			margin-top: 0.5rem;
		}

		&[data-side="left"] {
			right: anchor(left);
			align-self: anchor-center;
			margin-right: 0.5rem;
		}

		&[data-side="right"] {
			left: anchor(right);
			align-self: anchor-center;
			margin-left: 0.5rem;
		}

		&:popover-open {
			opacity: 1;
			scale: 1;

			@starting-style {
				opacity: 0;
				scale: 0.95;
			}
		}
	}
</style>
