<script lang="ts">
	import ChartBar from "~icons/ph/chart-bar";
	import Stop from "~icons/ph/stop-fill";

	import type { Poll } from "#lib/models/poll.svelte.js";

	import { formatDuration } from "#lib/util.js";

	import Progress from "../ui/Progress.svelte";
	import Username from "../user/Username.svelte";
	import NoticeAction, { details, hide } from "./NoticeAction.svelte";

	interface Props {
		poll: Poll;
	}

	const { poll }: Props = $props();

	let expanded = $state(true);
	let now = $state(Date.now());

	$effect(() => {
		if (poll.status !== "ACTIVE") return;

		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const remaining = $derived(Math.max(0, Math.ceil((poll.endsTimestamp - now) / 1000)));

	const status = $derived(
		poll.status === "ACTIVE" && remaining > 0 ? `${formatDuration(remaining)} left` : "Ended",
	);

	const leading = $derived(Math.max(0, ...poll.choices.map((c) => c.votes)));

	function percent(votes: number) {
		return poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
	}
</script>

<div class="p-2 text-sm" data-component="poll" data-status={poll.status}>
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground" data-slot="poll-header">
		<ChartBar class="size-3 shrink-0" data-slot="poll-icon" />

		<span class="truncate" data-slot="poll-label">
			Poll by <Username user={poll.creator} />
		</span>

		<span class="ml-auto shrink-0 whitespace-nowrap" data-slot="poll-status">{status}</span>

		<div class="flex shrink-0 items-center gap-0.5" data-slot="poll-actions">
			{#if poll.status === "ACTIVE" && poll.channel.isMod}
				<NoticeAction icon={Stop} tooltip="End poll" onclick={() => poll.end()} />
			{/if}

			{@render details(expanded, () => (expanded = !expanded))}
			{@render hide(() => (poll.hidden = true))}
		</div>
	</div>

	<p class="mb-1.5 font-medium" data-slot="poll-title">{poll.title}</p>

	{#if expanded}
		<ul class="flex flex-col gap-1.5" data-slot="poll-choices">
			{#each poll.choices as choice (choice.id)}
				{@const pct = percent(choice.votes)}
				{@const winner =
					poll.status !== "ACTIVE" && choice.votes === leading && leading > 0}

				<li data-slot="poll-choice" data-winner={winner ? true : null}>
					<div
						class="mb-0.5 flex items-center justify-between gap-2"
						data-slot="poll-choice-header"
					>
						<span class="truncate" data-slot="poll-choice-title">{choice.title}</span>

						<span
							class="text-xs whitespace-nowrap text-muted-foreground tabular-nums"
							data-slot="poll-choice-votes"
						>
							{pct}% ({choice.votes})
						</span>
					</div>

					<Progress
						value={pct}
						class={[
							"h-1.5",
							winner && "**:data-[slot=progress-indicator]:bg-green-500",
						]}
					/>
				</li>
			{/each}
		</ul>

		<p class="mt-1.5 text-xs text-muted-foreground tabular-nums" data-slot="poll-total">
			{poll.totalVotes.toLocaleString()}
			{poll.totalVotes === 1 ? "vote" : "votes"}
		</p>
	{/if}
</div>
