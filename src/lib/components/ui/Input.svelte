<script lang="ts">
	import { Input, type TextControlProps } from "@ui-sdk/svelte/input";
	import type { HTMLInputAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	type Props = Omit<HTMLInputAttributes, "value" | "defaultValue" | "children"> &
		TextControlProps & {
			bare?: boolean;
			ref?: HTMLInputElement | null;
		};

	let {
		class: className,
		bare = false,
		type = "text",
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<Input
	class={cn(
		bare
			? "min-w-0 bg-transparent text-ui outline-none placeholder:text-fg-faint"
			: "control-field w-full",
		"selection:bg-fg/20",
		className,
	)}
	{type}
	{...rest}
	bind:value
>
	{#snippet render({ props })}
		<input {...props} bind:this={ref} />
	{/snippet}
</Input>
