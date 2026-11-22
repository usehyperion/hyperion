<script lang="ts">
	import type { ComponentProps } from "svelte";

	import Input from "#lib/components/ui/Input.svelte";
	import { cn } from "#lib/util/styles.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		...props
	}: Omit<ComponentProps<typeof Input>, "bare"> = $props();
</script>

<Input
	bare
	data-slot="input-group-control"
	class={cn("h-full flex-1 self-stretch px-2", className)}
	{...props}
	bind:value
	bind:ref
/>
