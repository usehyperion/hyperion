<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	interface Props extends HTMLAttributes<HTMLDivElement> {
		color?: string;
		children: Snippet;
	}

	const { class: className, color, children, ...rest }: Props = $props();
</script>

<div
	class={["callout my-0.5 border-l-4 bg-tint p-2", className]}
	style:border-color={color}
	{...rest}
>
	{@render children()}
</div>
