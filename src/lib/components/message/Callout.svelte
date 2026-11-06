<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/**
		 * The color of the left border. Can be omitted when a border color class
		 * is passed instead.
		 */
		color?: string;
		children: Snippet;
	}

	const { color, class: className, children, ...rest }: Props = $props();
</script>

<div {...rest} class={["my-0.5 border-l-4 bg-muted/50 p-2", className]} style:border-color={color}>
	{@render children()}
</div>
