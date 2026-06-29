<script lang="ts">
	import type { Poll } from "$lib/models/poll.svelte";
	import { colorizeName, formatDuration } from "$lib/util";
	import ChartBar from "~icons/ph/chart-bar";
	import Stop from "~icons/ph/stop-fill";
	import Progress from "../ui/Progress.svelte";
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

<div class="p-2 text-sm">
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
		<ChartBar class="size-3 shrink-0" />

		<span class="truncate">
			Poll by {@html colorizeName(poll.creator)}
		</span>

		<span class="ml-auto shrink-0 whitespace-nowrap">{status}</span>

		<div class="flex shrink-0 items-center gap-0.5">
			{#if poll.status === "ACTIVE" && poll.channel.isMod}
				<NoticeAction icon={Stop} tooltip="End poll" onclick={() => poll.end()} />
			{/if}

			{@render details(expanded, () => (expanded = !expanded))}
			{@render hide(() => (poll.hidden = true))}
		</div>
	</div>

	<p class="mb-1.5 font-medium">{poll.title}</p>

	{#if expanded}
		<ul class="flex flex-col gap-1.5">
			{#each poll.choices as choice (choice.id)}
				{@const pct = percent(choice.votes)}
				{@const winner =
					poll.status !== "ACTIVE" && choice.votes === leading && leading > 0}

				<li>
					<div class="mb-0.5 flex items-center justify-between gap-2">
						<span class="truncate">{choice.title}</span>

						<span class="text-xs whitespace-nowrap text-muted-foreground">
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

		<p class="mt-1.5 text-xs text-muted-foreground">
			{poll.totalVotes.toLocaleString()}
			{poll.totalVotes === 1 ? "vote" : "votes"}
		</p>
	{/if}
</div>
