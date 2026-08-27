<script lang="ts">
	import { RadioGroup } from "bits-ui";
	import { cn } from "tailwind-variants";

	let {
		class: className,
		value = $bindable(""),
		ref = $bindable(null),
		...rest
	}: RadioGroup.RootProps = $props();
</script>

<RadioGroup.Root
	class={cn("grid gap-3", className)}
	data-component="radio-group"
	bind:value
	bind:ref
	{...rest}
/>
