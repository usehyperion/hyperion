<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";

	import { type WithElementRef } from "#lib/util/index.js";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...props
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<!-- ui-sdk's InputGroup registers as a second, unnamed input for agents; the app never uses InputClear. -->
<div
	bind:this={ref}
	role="group"
	data-slot="input-group"
	class={cn(
		"group/input-group relative control-field w-full gap-0 px-0",
		"has-[>[data-align^=block]]:h-auto has-[>[data-align^=block]]:flex-col has-[>textarea]:h-auto",
		"has-disabled:opacity-50 has-[[aria-invalid=true]]:border-danger",
		className,
	)}
	{...props}
>
	{@render children?.()}
</div>
