<script lang="ts">
	import { cn } from "tailwind-variants";
	import * as NativeSelect from "$lib/components/ui/native-select";
	import type { HighlightConfig } from "$lib/settings";

	const styles = [
		{ label: "Default", value: "default" },
		{ label: "Compact", value: "compact" },
		{ label: "Background", value: "background" },
		{ label: "Disabled", value: "disabled" },
	];

	let { config = $bindable<HighlightConfig>(), class: className = undefined } = $props();
</script>

<NativeSelect.Root
	class={cn("min-w-32", className)}
	aria-label="Highlight style"
	bind:value={
		() => (config.enabled ? config.style : "disabled"),
		(value) => {
			if (value === "disabled") {
				config.enabled = false;
			} else {
				config.enabled = true;
				config.style = value;
			}
		}
	}
>
	{#each styles as style}
		<NativeSelect.Option value={style.value}>
			{style.label}
		</NativeSelect.Option>
	{/each}
</NativeSelect.Root>
