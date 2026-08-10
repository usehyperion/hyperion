<script lang="ts">
	import ColorPicker from "$lib/components/ui/ColorPicker.svelte";
	import Popover from "$lib/components/ui/Popover.svelte";

	interface Props {
		id: string;
		value: string;
	}

	let { id, value = $bindable() }: Props = $props();
</script>

<button
	class="size-8 shrink-0 cursor-pointer rounded-lg border border-black/15 bg-(--highlight) shadow-xs ring-offset-background transition-[filter,scale,box-shadow] outline-none hover:scale-105 focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-white/20"
	popovertarget="color-picker-{id}"
	title="Change color"
	aria-label="Toggle color picker"
	style:--highlight={value}
></button>

<Popover id="color-picker-{id}" class="w-60">
	<ColorPicker bind:value />
</Popover>
