<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";

	import type { WithElementRef } from "#lib/util/index.js";

	import Separator from "#lib/components/ui/Separator.svelte";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		children?: Snippet;
	} = $props();

	const hasContent = $derived(!!children);
</script>

<div
	bind:this={ref}
	data-slot="field-separator"
	data-content={hasContent}
	class={cn("relative -my-1 h-5 text-2xs", className)}
	{...restProps}
>
	<Separator class="absolute inset-0 top-1/2" />
	{#if children}
		<span
			class="relative mx-auto block w-fit bg-surface-0 px-2 text-fg-muted"
			data-slot="field-separator-content"
		>
			{@render children()}
		</span>
	{/if}
</div>
