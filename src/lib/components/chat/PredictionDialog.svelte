<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import Plus from "~icons/ph/plus";
	import X from "~icons/ph/x";
	import { Button } from "../ui/button";
	import Dialog from "../ui/Dialog.svelte";
	import * as Field from "../ui/field";
	import { Input } from "../ui/input";
	import { NativeSelect } from "../ui/native-select";

	const TITLE_MAX = 45;
	const OUTCOME_MAX = 25;
	const MIN_OUTCOMES = 2;
	const MAX_OUTCOMES = 10;

	const WINDOWS = [
		{ label: "30 seconds", value: 30 },
		{ label: "1 minute", value: 60 },
		{ label: "2 minutes", value: 120 },
		{ label: "5 minutes", value: 300 },
		{ label: "10 minutes", value: 600 },
		{ label: "30 minutes", value: 1800 },
	];

	interface Props {
		channel: Channel;
	}

	let { channel }: Props = $props();
	const id = $props.id();

	let title = $state("");
	let outcomes = $state(["", ""]);
	let window = $state(120);

	const validOutcomes = $derived(outcomes.map((o) => o.trim()).filter(Boolean));
	const canSubmit = $derived(title.trim().length > 0 && validOutcomes.length >= MIN_OUTCOMES);

	function reset() {
		title = "";
		outcomes = ["", ""];
		window = 120;
	}

	function addOutcome() {
		if (outcomes.length < MAX_OUTCOMES) outcomes.push("");
	}

	function removeOutcome(index: number) {
		if (outcomes.length > MIN_OUTCOMES) outcomes.splice(index, 1);
	}

	async function create() {
		if (!canSubmit) return;

		await channel.createPrediction({
			title: title.trim(),
			outcomes: validOutcomes,
			window,
		});

		reset();
	}
</script>

<Dialog id="prediction-dialog">
	{#snippet header()}
		<h2>Create prediction</h2>
		<p>Let your community wager channel points.</p>
	{/snippet}

	<Field.Field>
		<Field.Label for="title-{id}">Question</Field.Label>

		<Input
			id="title-{id}"
			placeholder="Will we win this game?"
			maxlength={TITLE_MAX}
			bind:value={title}
		/>
	</Field.Field>

	<Field.Field>
		<Field.Label>Outcomes</Field.Label>

		{#each outcomes as _, index (index)}
			<div class="flex items-center gap-1">
				<Input
					placeholder="Outcome {index + 1}"
					maxlength={OUTCOME_MAX}
					bind:value={outcomes[index]}
				/>

				{#if outcomes.length > MIN_OUTCOMES}
					<Button
						class="shrink-0"
						size="icon"
						variant="ghost"
						aria-label="Remove outcome"
						onclick={() => removeOutcome(index)}
					>
						<X />
					</Button>
				{/if}
			</div>
		{/each}

		{#if outcomes.length < MAX_OUTCOMES}
			<Button class="self-start" size="sm" variant="ghost" onclick={addOutcome}>
				<Plus />
				Add outcome
			</Button>
		{/if}
	</Field.Field>

	<Field.Field>
		<Field.Label for="window-{id}">Submission window</Field.Label>

		<NativeSelect id="window-{id}" bind:value={window}>
			{#each WINDOWS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</NativeSelect>
	</Field.Field>

	{#snippet footer()}
		<Button disabled={!canSubmit} onclickwait={create}>Create prediction</Button>
	{/snippet}
</Dialog>
