<script lang="ts">
	import * as NativeSelect from "$lib/components/ui/native-select";
	import type { HighlightConfig } from "$lib/settings";

	const styles = [
		{ label: "Default", value: "default" },
		{ label: "Compact", value: "compact" },
		{ label: "Background", value: "background" },
		{ label: "Disabled", value: "disabled" },
	];

	let { config = $bindable<HighlightConfig>() } = $props();
</script>

<NativeSelect.Root
	class="min-w-36"
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
