<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		color?: string;
		children: Snippet;
	}

	const { class: className, color, children, ...rest }: Props = $props();
</script>

<div class={["my-0.5 border-l-4 bg-muted/50 p-2", className]} style:border-color={color} {...rest}>
	{@render children()}
</div>
