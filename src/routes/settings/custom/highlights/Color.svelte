<script lang="ts">
	import { Popover } from "bits-ui";
	import ColorPicker from "$lib/components/ui/ColorPicker.svelte";

	let { value = $bindable<string>() } = $props();
</script>

<Popover.Root>
	<Popover.Trigger class="size-9 rounded-md bg-(--highlight)" --highlight={value} />

	<Popover.Portal>
		<Popover.Content class="w-60" sideOffset={10}>
			<ColorPicker class="rounded-md border bg-popover p-3" bind:value />
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
