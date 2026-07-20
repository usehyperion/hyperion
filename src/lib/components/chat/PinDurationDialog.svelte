<script lang="ts">
	import type { Pin } from "$lib/models/pin.svelte";
	import { clamp, formatDuration } from "$lib/util";
	import Button from "../ui/Button.svelte";
	import Dialog from "../ui/Dialog.svelte";
	import * as Field from "../ui/field";
	import * as RadioGroup from "../ui/radio-group";
	import Slider from "../ui/Slider.svelte";

	const MIN_DURATION = 30;
	const MAX_DURATION = 30 * 60;

	interface Props {
		pin: Pin;
	}

	const { pin }: Props = $props();
	const id = $props.id();

	let mode = $derived(pin.duration === null ? "stream" : "duration");
	let duration = $derived(clamp(MIN_DURATION, pin.duration ?? 1200, MAX_DURATION));

	async function save() {
		await pin.update(mode === "stream" ? null : duration);
	}
</script>

<Dialog id="pin-duration-dialog-{pin.message.id}">
	{#snippet header()}
		<h2>Pin duration</h2>
		<p>Choose how long this message stays pinned</p>
	{/snippet}

	<RadioGroup.Root bind:value={mode}>
		<Field.Field class="mb-1" orientation="horizontal">
			<RadioGroup.Item id="d-{id}" value="duration" />

			<Field.Label class="font-normal" for="d-{id}">For a set duration</Field.Label>
		</Field.Field>

		<Slider
			class="relative flex items-center"
			type="single"
			min={MIN_DURATION}
			max={MAX_DURATION}
			step={30}
			disabled={mode !== "duration"}
			thumbLabel={formatDuration(duration)}
			bind:value={duration}
		/>

		<Field.Field class="mt-4" orientation="horizontal">
			<RadioGroup.Item id="s-{id}" value="stream" />

			<Field.Label class="font-normal" for="s-{id}">Until the stream ends</Field.Label>
		</Field.Field>
	</RadioGroup.Root>

	{#snippet footer()}
		<Button onclickwait={save}>Save</Button>
	{/snippet}
</Dialog>
