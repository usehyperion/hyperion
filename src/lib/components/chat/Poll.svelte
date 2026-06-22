<script lang="ts">
	import type { Poll } from "$lib/models/poll.svelte";
	import { formatDuration } from "$lib/util";
	import CaretDown from "~icons/ph/caret-down";
	import CaretUp from "~icons/ph/caret-up";
	import ChartBar from "~icons/ph/chart-bar";
	import StopCircle from "~icons/ph/stop-circle";
	import { Button } from "../ui/button";
	import { Progress } from "../ui/progress";
	import * as Tooltip from "../ui/tooltip";

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

	const remaining = $derived(Math.max(0, Math.ceil((poll.endsAt - now) / 1000)));

	const label = $derived(
		poll.status === "ACTIVE"
			? remaining > 0
				? `${formatDuration(remaining)} left`
				: "Ending…"
			: poll.status === "TERMINATED"
				? "Ended"
				: "Final results",
	);

	function percent(votes: number) {
		return poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0;
	}

	const leading = $derived(Math.max(0, ...poll.choices.map((c) => c.votes)));
</script>

<div
	class="absolute inset-x-2 bottom-2 z-10 overflow-hidden rounded-md border bg-background p-2 text-sm shadow-md"
>
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
		<ChartBar class="size-3" />
		<p class="truncate font-medium text-foreground">{poll.title}</p>

		<span class="ml-auto whitespace-nowrap">{label}</span>

		<div class="flex items-center gap-0.5">
			{#if poll.status === "ACTIVE" && poll.chat.channel.isMod}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								class="size-5 [&_svg]:size-3.5"
								size="icon-sm"
								variant="ghost"
								aria-label="End poll"
								onclick={() => poll.terminate()}
							>
								<StopCircle />
							</Button>
						{/snippet}
					</Tooltip.Trigger>

					<Tooltip.Content side="top">End poll</Tooltip.Content>
				</Tooltip.Root>
			{/if}

			<Button
				class="size-5 [&_svg]:size-3.5"
				size="icon-sm"
				variant="ghost"
				aria-label={expanded ? "Collapse" : "Expand"}
				onclick={() => (expanded = !expanded)}
			>
				{#if expanded}
					<CaretUp />
				{:else}
					<CaretDown />
				{/if}
			</Button>
		</div>
	</div>

	{#if expanded}
		<ul class="flex flex-col gap-1.5">
			{#each poll.choices as choice (choice.id)}
				{@const pct = percent(choice.votes)}

				<li>
					<div class="mb-0.5 flex items-center justify-between gap-2">
						<span
							class="truncate"
							class:font-semibold={poll.status !== "ACTIVE" &&
								choice.votes === leading &&
								leading > 0}
						>
							{choice.title}
						</span>

						<span class="text-xs whitespace-nowrap text-muted-foreground">
							{pct}% ({choice.votes})
						</span>
					</div>

					<Progress value={pct} class="h-1.5" />
				</li>
			{/each}
		</ul>

		<p class="mt-1.5 text-xs text-muted-foreground">
			{poll.totalVotes.toLocaleString()}
			{poll.totalVotes === 1 ? "vote" : "votes"}
		</p>
	{/if}
</div>
