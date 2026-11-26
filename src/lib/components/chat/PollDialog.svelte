<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";

	import { dialogs } from "#lib/dialog.js";

	import Field from "../ui/Field.svelte";
	import NumberInput from "../ui/NumberInput.svelte";
	import Switch from "../ui/Switch.svelte";
	import NoticeDialog from "./NoticeDialog.svelte";

	const POINTS_MAX = 1_000_000;

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

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
	onstart={(input) =>
		channel.startPoll({
			title: input.title,
			choices: input.options,
			duration: input.duration,
			channelPointsPerVote: pointsEnabled ? pointsPerVote : undefined,
		})}
	onreset={() => {
		pointsEnabled = false;
		pointsPerVote = 100;
	}}
>
	<Field
		layout="row"
		label="Channel points voting"
		description="Let viewers spend points for extra votes."
	>
		<Switch bind:checked={pointsEnabled} />
	</Field>

	{#if pointsEnabled}
		<Field layout="inline" label="Points per vote">
			<NumberInput
				min={1}
				max={POINTS_MAX}
				bind:value={() => pointsPerVote, (value) => (pointsPerVote = value ?? 1)}
			/>
		</Field>
	{/if}
</NoticeDialog>
