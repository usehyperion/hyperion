<script lang="ts">
	import type { Channel } from "$lib/models/channel.svelte";
	import { Poll } from "$lib/models/poll.svelte";
	import Plus from "~icons/ph/plus";
	import X from "~icons/ph/x";
	import { Button } from "../ui/button";
	import * as Dialog from "../ui/dialog";
	import * as Field from "../ui/field";
	import { Input } from "../ui/input";
	import { NativeSelect } from "../ui/native-select";
	import { Switch } from "../ui/switch";

	const TITLE_MAX = 60;
	const CHOICE_MAX = 25;
	const MIN_CHOICES = 2;
	const MAX_CHOICES = 5;
	const POINTS_MAX = 1_000_000;

	const DURATIONS = [
		{ label: "30 seconds", value: 30 },
		{ label: "1 minute", value: 60 },
		{ label: "2 minutes", value: 120 },
		{ label: "3 minutes", value: 180 },
		{ label: "5 minutes", value: 300 },
		{ label: "10 minutes", value: 600 },
	];

	interface Props {
		channel: Channel;
		open: boolean;
	}

	const id = $props.id();

	let { channel, open = $bindable() }: Props = $props();

	let title = $state("");
	let choices = $state(["", ""]);
	let duration = $state(120);
	let pointsEnabled = $state(false);
	let pointsPerVote = $state(100);

	const validChoices = $derived(choices.map((c) => c.trim()).filter(Boolean));
	const canSubmit = $derived(title.trim().length > 0 && validChoices.length >= MIN_CHOICES);

	function reset() {
		title = "";
		choices = ["", ""];
		duration = 120;
		pointsEnabled = false;
		pointsPerVote = 100;
	}

	function addChoice() {
		if (choices.length < MAX_CHOICES) choices.push("");
	}

	function removeChoice(index: number) {
		if (choices.length > MIN_CHOICES) choices.splice(index, 1);
	}

	async function create() {
		if (!canSubmit) return;

		await Poll.create(channel, {
			title: title.trim(),
			choices: validChoices,
			duration,
			channelPointsVoting: pointsEnabled,
			channelPointsPerVote: pointsEnabled ? pointsPerVote : undefined,
		});

		open = false;
		reset();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-sm!">
		<Dialog.Header>
			<Dialog.Title>Create poll</Dialog.Title>

			<Dialog.Description>Ask your community a question.</Dialog.Description>
		</Dialog.Header>

		<Field.Field>
			<Field.Label for="title-{id}">Question</Field.Label>

			<Input
				id="title-{id}"
				placeholder="What should we play next?"
				maxlength={TITLE_MAX}
				bind:value={title}
			/>
		</Field.Field>

		<Field.Field>
			<Field.Label>Choices</Field.Label>

			{#each choices as _, index (index)}
				<div class="flex items-center gap-1">
					<Input
						placeholder="Choice {index + 1}"
						maxlength={CHOICE_MAX}
						bind:value={choices[index]}
					/>

					{#if choices.length > MIN_CHOICES}
						<Button
							class="shrink-0"
							size="icon"
							variant="ghost"
							aria-label="Remove choice"
							onclick={() => removeChoice(index)}
						>
							<X />
						</Button>
					{/if}
				</div>
			{/each}

			{#if choices.length < MAX_CHOICES}
				<Button class="self-start" size="sm" variant="ghost" onclick={addChoice}>
					<Plus />
					Add choice
				</Button>
			{/if}
		</Field.Field>

		<Field.Field>
			<Field.Label for="duration-{id}">Duration</Field.Label>

			<NativeSelect id="duration-{id}" bind:value={duration}>
				{#each DURATIONS as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</NativeSelect>
		</Field.Field>

		<Field.Field orientation="horizontal">
			<Field.Content>
				<Field.Label for="points-{id}">Channel points voting</Field.Label>

				<Field.Description>Let viewers spend points for extra votes.</Field.Description>
			</Field.Content>

			<Switch id="points-{id}" bind:checked={pointsEnabled} />
		</Field.Field>

		{#if pointsEnabled}
			<Field.Field>
				<Field.Label for="cost-{id}">Points per vote</Field.Label>

				<Input
					id="cost-{id}"
					type="number"
					min={1}
					max={POINTS_MAX}
					bind:value={pointsPerVote}
				/>
			</Field.Field>
		{/if}

		<Dialog.Footer>
			<Button disabled={!canSubmit} onclickwait={create}>Create poll</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
