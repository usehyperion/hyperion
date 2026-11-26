<script lang="ts">
	import ColorPicker from "#lib/components/ui/ColorPicker.svelte";
	import Popover from "#lib/components/ui/Popover.svelte";

	interface Props {
		id: string;
		value: string;
	}

	let { id, value = $bindable() }: Props = $props();
</script>

<Popover class="w-60" side="bottom" aria-label="Highlight color">
	{#snippet trigger(props)}
		<button
			{...props}
			class="size-7 shrink-0 cursor-pointer rounded-control border border-line-strong bg-(--highlight) control-focus transition-[filter] hover:brightness-110"
			title="Change color"
			aria-label="Toggle color picker"
			style:--highlight={value}
		></button>
	{/snippet}

	<ColorPicker bind:value />
</Popover>
