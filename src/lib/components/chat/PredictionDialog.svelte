<script lang="ts">
	import type { Channel } from "#lib/models/channel.svelte.js";

	import { dialogs } from "#lib/dialogs.js";

	import NoticeDialog from "./NoticeDialog.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();
</script>

<NoticeDialog
	id={dialogs.prediction(channel.id)}
	heading="Create prediction"
	description="Let your community wager channel points."
	placeholder="Will we win this game?"
	titleMax={45}
	noun="outcome"
	maxOptions={10}
	durationLabel="Submission window"
	durations={[30, 60, 120, 300, 600, 1800]}
	submitLabel="Start prediction"
	onstart={({ title, options, duration }) =>
		channel.startPrediction({ title, outcomes: options, window: duration })}
/>
