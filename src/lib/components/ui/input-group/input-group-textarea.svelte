<script lang="ts">
	import type { ComponentProps } from "svelte";

	import Textarea from "#lib/components/ui/Textarea.svelte";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...props
	}: Omit<ComponentProps<typeof Textarea>, "bare"> = $props();
</script>

<Textarea
	bare
	data-slot="input-group-control"
	class={cn("w-full flex-1", className)}
	{...props}
	bind:value
	bind:ref
/>
