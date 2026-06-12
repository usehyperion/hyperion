<script lang="ts">
	import type { Pin } from "$lib/models/chat.svelte";
	import { clamp, formatDuration } from "$lib/util";
	import { Button } from "../ui/button";
	import * as Dialog from "../ui/dialog";
	import * as Field from "../ui/field";
	import * as RadioGroup from "../ui/radio-group";
	import { Slider } from "../ui/slider";

	const MIN_DURATION = 30;
	const MAX_DURATION = 30 * 60;

	interface Props {
		pin: Pin;
		open: boolean;
	}

	const id = $props.id();

	let { pin, open = $bindable() }: Props = $props();

	let mode = $derived(pin.duration === null ? "stream" : "duration");
	let duration = $derived(clamp(MIN_DURATION, pin.duration ?? 1200, MAX_DURATION));

	async function save() {
		await pin.message.channel.chat.updatePin(mode === "stream" ? null : duration);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-sm!">
		<Dialog.Header>
			<Dialog.Title>Pin duration</Dialog.Title>

			<Dialog.Description>Choose how long this message stays pinned.</Dialog.Description>
		</Dialog.Header>

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

		<Dialog.Footer>
			<Button onclickwait={save}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
