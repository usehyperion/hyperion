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
	class="size-9 rounded-md bg-(--highlight)"
	popovertarget="color-picker-{id}"
	aria-label="Toggle color picker"
	style:--highlight={value}
></button>

<Popover id="color-picker-{id}" class="w-60">
	<ColorPicker bind:value />
</Popover>
