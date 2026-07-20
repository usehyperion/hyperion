<script lang="ts">
	import { Label } from "bits-ui";
	import { cn } from "cnfast";

	let { class: className, ref = $bindable(null), ...rest }: Label.RootProps = $props();
</script>

<Label.Root
	class={cn(
		"flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
		className,
	)}
	data-component="label"
	{...rest}
	bind:ref
/>
