<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		side?: "top" | "right" | "bottom" | "left";
	}

	const { class: className, side = "top", children, ...rest }: Props = $props();
	const id = $props.id();

	let ref = $state<HTMLDivElement>();

	const anchorName = `--tooltip-${id}`;

	$effect(() => {
		const trigger = ref?.previousElementSibling;
		if (!(trigger instanceof HTMLElement)) return;

		trigger.style.setProperty("anchor-name", anchorName);

		return () => trigger.style.removeProperty("anchor-name");
	});
</script>

<div
	class={className}
	role="tooltip"
	data-component="tooltip"
	data-side={side}
	style:position-anchor={anchorName}
	{...rest}
	bind:this={ref}
>
	{@render children?.()}
</div>
