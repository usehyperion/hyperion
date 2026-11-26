<script lang="ts">
	import { Textarea, type TextareaOptions, type TextControlProps } from "@ui-sdk/svelte/textarea";
	import type { HTMLTextareaAttributes } from "svelte/elements";

	import { cn } from "#lib/util/styles.js";

	type BaseProps = Omit<HTMLTextareaAttributes, "value" | "defaultValue"> &
		TextControlProps &
		Pick<TextareaOptions, "autoResize" | "submitShortcut" | "onSubmit">;

	interface Props extends BaseProps {
		bare?: boolean;
		ref?: HTMLTextAreaElement | null;
	}

	let {
		class: className,
		bare = false,
		value = $bindable(),
		ref = $bindable(null),
		...rest
	}: Props = $props();
</script>

<Textarea
	class={cn(
		bare
			? "min-h-16 bg-transparent px-2 py-1.5 text-ui outline-none placeholder:text-fg-faint"
			: "control-field h-auto min-h-16 w-full items-start py-1.5",
		"resize-none selection:bg-fg/20",
		className,
	)}
	autoResize
	{...rest}
	bind:value
>
	{#snippet render({ props })}
		<textarea {...props} bind:this={ref}></textarea>
	{/snippet}
</Textarea>
