<script lang="ts">
	import { cn } from "tailwind-variants";

	import type { HighlightConfig } from "#lib/settings/index.js";

	import Select from "#lib/components/ui/Select.svelte";

	const styles = [
		{ label: "Default", value: "default" },
		{ label: "Compact", value: "compact" },
		{ label: "Background", value: "background" },
		{ label: "Disabled", value: "disabled" },
	];

	let { config = $bindable<HighlightConfig>(), class: className = undefined } = $props();
</script>

<Select
	class={cn("h-8 min-w-32", className)}
	options={styles}
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
/>
