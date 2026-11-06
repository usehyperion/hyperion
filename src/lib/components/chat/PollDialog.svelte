<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";

	import { dialogs } from "#lib/dialogs.js";

	import * as Field from "../ui/field";
	import Input from "../ui/Input.svelte";
	import Switch from "../ui/Switch.svelte";
	import NoticeDialog from "./NoticeDialog.svelte";

	const POINTS_MAX = 1_000_000;

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
	const id = $props.id();

	let pointsEnabled = $state(false);
	let pointsPerVote = $state(100);
</script>

<NoticeDialog
	id={dialogs.poll(channel.id)}
	heading="Create poll"
	description="Ask your community a question."
	placeholder="What should we play next?"
	titleMax={60}
	noun="choice"
	maxOptions={5}
	durationLabel="Duration"
	durations={[60, 120, 180, 300, 600, 1800]}
	submitLabel="Start poll"
	onstart={({ title, options, duration }) =>
		channel.startPoll({
			title,
			choices: options,
			duration,
			channelPointsPerVote: pointsEnabled ? pointsPerVote : undefined,
		})}
	onreset={() => {
		pointsEnabled = false;
		pointsPerVote = 100;
	}}
>
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
</NoticeDialog>
