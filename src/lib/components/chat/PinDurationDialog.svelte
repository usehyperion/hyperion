<script lang="ts">
	import type { Pin } from "#lib/models/pin.svelte.js";

	import { closeDialog, dialogs } from "#lib/dialog.js";
	import { clamp } from "#lib/util/math.js";
	import { formatDuration } from "#lib/util/time.js";

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

	let error = $state<string | null>(null);

	let mode = $derived(pin.duration === null ? "stream" : "duration");
	let duration = $derived(clamp(MIN_DURATION, pin.duration ?? 1200, MAX_DURATION));

	const dialogId = $derived(dialogs.pinDuration(pin.message.id));

	async function save() {
		error = null;

		try {
			await pin.update(mode === "stream" ? null : duration);
		} catch (err) {
			error = err instanceof Error ? err.message : "An unknown error occurred.";
			return;
		}

		closeDialog(dialogId);
	}
</script>

<Dialog
	id={dialogId}
	title="Pin duration"
	description="Choose how long this message stays pinned"
	onOpenChange={(open) => {
		if (!open) error = null;
	}}
>
	<RadioGroup.Root bind:value={mode}>
		<Field.Field class="mb-1" orientation="horizontal">
			<RadioGroup.Item id="d-{id}" value="duration" />

			<Field.Label class="font-normal" for="d-{id}">For a set duration</Field.Label>
		</Field.Field>

		<Slider
			type="single"
			min={MIN_DURATION}
			max={MAX_DURATION}
			step={[MIN_DURATION, 60, 120, 180, 300, 600, 900, 1200, MAX_DURATION]}
			disabled={mode !== "duration"}
			formatValue={formatDuration}
			bind:value={duration}
		/>

		<Field.Field class="mt-4" orientation="horizontal">
			<RadioGroup.Item id="s-{id}" value="stream" />

			<Field.Label class="font-normal" for="s-{id}">Until the stream ends</Field.Label>
		</Field.Field>
	</RadioGroup.Root>

	{#if error}
		<p class="text-xs text-danger">{error}</p>
	{/if}

	{#snippet footer()}
		<Button size="sm" onclick={save}>Save</Button>
	{/snippet}
</Dialog>
