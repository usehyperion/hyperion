<script lang="ts">
	import type { Poll } from "#lib/models/poll.svelte.js";

	import { everySecond } from "#lib/clock.js";
	import { IconEndPoll, IconPoll } from "#lib/icons.js";
	import { percent } from "#lib/util/math.js";
	import { formatDuration } from "#lib/util/time.js";

	import Meter from "../ui/Meter.svelte";
	import Username from "../user/Username.svelte";
	import NoticeAction, { details, hide } from "./NoticeAction.svelte";

	interface Props {
		poll: Poll;
	}

	const { poll }: Props = $props();

	let expanded = $state(true);

	const remaining = $derived(
		Math.max(0, Math.ceil((poll.endsTimestamp - everySecond.now) / 1000)),
	);

	const status = $derived(
		poll.active && remaining > 0 ? `${formatDuration(remaining)} left` : "Ended",
	);

	const leading = $derived(Math.max(0, ...poll.choices.map((c) => c.votes)));
</script>

<div class="p-2 text-ui">
	<div class="mb-1 flex items-center gap-1 text-2xs text-fg-muted">
		<IconPoll class="size-3 shrink-0" />

		<span class="truncate">
			Poll {#if poll.creator}by <Username user={poll.creator} />{/if}
		</span>

		<span class="ml-auto shrink-0 whitespace-nowrap">{status}</span>

		<div class="flex shrink-0 items-center gap-0.5">
			{#if poll.active && poll.channel.isMod}
				<NoticeAction icon={IconEndPoll} tooltip="End poll" onclick={() => poll.end()} />
			{/if}

			{@render details(expanded, () => (expanded = !expanded))}
			{@render hide(() => (poll.hidden = true))}
		</div>
	</div>

	<p class="mb-1.5 font-medium">{poll.title}</p>

	{#if expanded}
		<ul class="flex flex-col gap-1.5">
			{#each poll.choices as choice (choice.id)}
				{@const pct = percent(choice.votes, poll.totalVotes)}
				{@const winner = !poll.active && choice.votes === leading && leading > 0}

				<li>
					<div class="mb-0.5 flex items-center justify-between gap-2">
						<span class="truncate">{choice.title}</span>

						<span class="text-2xs whitespace-nowrap text-fg-muted tabular-nums">
							{pct}% ({choice.votes})
						</span>
					</div>

					<Meter
						value={pct}
						aria-label={choice.title}
						indicatorClass={winner ? "bg-success" : undefined}
					/>
				</li>
			{/each}
		</ul>

		<p class="mt-1.5 text-2xs text-fg-muted tabular-nums">
			{poll.totalVotes.toLocaleString()}
			{poll.totalVotes === 1 ? "vote" : "votes"}
		</p>
	{/if}
</div>
