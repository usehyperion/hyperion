<script lang="ts">
	import type { WithElementRef } from "bits-ui";
	import { cn } from "cnfast";
	import { onMount } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { browser } from "$app/environment";

	interface Props extends WithElementRef<HTMLAttributes<HTMLDivElement>> {
		side?: "top" | "right" | "bottom" | "left";
		delay?: number;
	}

	let {
		class: className,
		side = "top",
		delay = 300,
		ref = $bindable(null),
		children,
		...rest
	}: Props = $props();

	const id = $props.id();

	const anchorName = `--tooltip-${id}`;

	$effect(() => {
		const trigger = ref?.previousElementSibling;
		if (!(trigger instanceof HTMLElement)) return;

		trigger.style.setProperty("anchor-name", anchorName);

		return () => trigger.style.removeProperty("anchor-name");
	});
</script>

<div
	class={cn(
		"pointer-events-none fixed z-50 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground opacity-0 transition-[opacity,scale] delay-0",
		className,
	)}
	role="tooltip"
	data-component="tooltip"
	data-side={side}
	style:--tooltip-delay="{delay}ms"
	style:position-anchor={anchorName}
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

	[data-component="tooltip"] {
		--tooltip-arrow-offset: -0.25rem;

		&::after {
			content: "";
			position: absolute;
			width: 0.5rem;
			height: 0.5rem;
			background-color: inherit;
			rotate: 45deg;
		}

		&[data-side="top"] {
			bottom: anchor(top);
			justify-self: anchor-center;
			margin-bottom: 0.5rem;

			&::after {
				bottom: var(--tooltip-arrow-offset);
				left: 50%;
				translate: -50% 0;
			}
		}

		&[data-side="bottom"] {
			top: anchor(bottom);
			justify-self: anchor-center;
			margin-top: 0.5rem;

			&::after {
				top: var(--tooltip-arrow-offset);
				left: 50%;
				translate: -50% 0;
			}
		}

		&[data-side="left"] {
			right: anchor(left);
			align-self: anchor-center;
			margin-right: 0.5rem;

			&::after {
				right: var(--tooltip-arrow-offset);
				top: 50%;
				translate: 0 -50%;
			}
		}

		&[data-side="right"] {
			left: anchor(right);
			align-self: anchor-center;
			margin-left: 0.5rem;

			&::after {
				left: var(--tooltip-arrow-offset);
				top: 50%;
				translate: 0 -50%;
			}
		}
	}
</style>
