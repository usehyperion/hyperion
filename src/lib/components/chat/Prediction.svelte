<script lang="ts">
	import type { Prediction } from "$lib/models/prediction.svelte";
	import { colorizeName, formatDuration } from "$lib/util";
	import Crown from "~icons/ph/crown-simple-fill";
	import LockSimple from "~icons/ph/lock-simple";
	import Prohibit from "~icons/ph/prohibit";
	import SealQuestion from "~icons/ph/seal-question";
	import { Progress } from "../ui/progress";
	import Tooltip from "../ui/Tooltip.svelte";
	import NoticeAction, { details, hide } from "./NoticeAction.svelte";

	interface Props {
		prediction: Prediction;
	}

	const { prediction }: Props = $props();

	const DUO = ["bg-blue-500", "bg-pink-500"];

	const RAINBOW = [
		"bg-red-500",
		"bg-orange-500",
		"bg-yellow-500",
		"bg-green-500",
		"bg-teal-500",
		"bg-cyan-500",
		"bg-blue-500",
		"bg-indigo-500",
		"bg-violet-500",
		"bg-fuchsia-500",
	];

	let expanded = $state(true);
	let now = $state(Date.now());

	$effect(() => {
		if (prediction.status !== "ACTIVE") return;

		const id = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(id);
	});

	const remaining = $derived(Math.max(0, Math.ceil((prediction.locksTimestamp - now) / 1000)));

	const status = $derived.by(() => {
		switch (prediction.status) {
			case "ACTIVE":
				return remaining > 0 ? `${formatDuration(remaining)} left` : "Locking";
			case "LOCKED":
				return "Locked";
			case "RESOLVE_PENDING":
				return "Resolving";
			case "RESOLVED":
				return "Resolved";
			case "CANCEL_PENDING":
				return "Refunding";
			case "CANCELED":
				return "Refunded";
		}
	});

	function colorFor(index: number) {
		return prediction.outcomes.length <= 2 ? DUO[index] : RAINBOW[index];
	}

	function percent(points: number) {
		return prediction.totalPoints > 0 ? Math.round((points / prediction.totalPoints) * 100) : 0;
	}

	function ratio(points: number) {
		return points > 0 ? prediction.totalPoints / points : 0;
	}
</script>

<div class="p-2 text-sm">
	<div class="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
		<SealQuestion class="size-3 shrink-0" />

		<span class="truncate">
			Prediction {#if prediction.creator}by {@html colorizeName(prediction.creator)}{/if}
		</span>

		<span class="ml-auto shrink-0 whitespace-nowrap">{status}</span>

		<div class="flex shrink-0 items-center gap-0.5">
			{#if prediction.channel.isMod}
				{#if prediction.status === "ACTIVE"}
					<NoticeAction
						icon={LockSimple}
						tooltip="Lock prediction"
						onclick={() => prediction.lock()}
					/>
				{/if}

				{#if prediction.status === "ACTIVE" || prediction.status === "LOCKED"}
					<NoticeAction
						icon={Prohibit}
						tooltip="Cancel prediction"
						onclick={() => prediction.cancel()}
					/>
				{/if}
			{/if}

			{@render details(expanded, () => (expanded = !expanded))}
			{@render hide(() => (prediction.hidden = true))}
		</div>
	</div>

	<p class="mb-1.5 font-medium">{prediction.title}</p>

	{#if expanded}
		<ul class="flex flex-col gap-1.5">
			{#each prediction.outcomes as outcome, i (outcome.id)}
				{@const pct = percent(outcome.points)}
				{@const won =
					prediction.status === "RESOLVED" && prediction.winningOutcomeId === outcome.id}
				{@const lost =
					prediction.status === "RESOLVED" && prediction.winningOutcomeId !== outcome.id}

				<li class="flex flex-col">
					<div class="mb-0.5 flex items-center gap-1.5">
						<span class="truncate">{outcome.title}</span>

						{#if won}
							<Crown class="size-3 shrink-0 text-yellow-400" />
						{/if}

						<span
							class="ml-auto shrink-0 text-xs whitespace-nowrap text-muted-foreground"
						>
							{pct}% ({outcome.points.toLocaleString()})
						</span>

						{#if prediction.channel.isMod && (prediction.status === "ACTIVE" || prediction.status === "LOCKED")}
							<NoticeAction
								icon={Crown}
								tooltip="Resolve as winner"
								onclick={() => prediction.resolve(outcome.id)}
							/>
						{/if}
					</div>

					<Progress
						class={["h-1.5", lost && "opacity-25"]}
						value={pct}
						indicatorClass={colorFor(i)}
						data-slot="tooltip-trigger"
					/>

					<Tooltip class="flex flex-col gap-0.5" side="top">
						<span class="flex items-center gap-1 font-medium">
							<span class={["size-2 shrink-0 rounded-full", colorFor(i)]}></span>

							{outcome.title}

							{#if won}
								<Crown class="size-3 text-yellow-400" />
							{/if}
						</span>

						<span>{outcome.points.toLocaleString()} points ({pct}%)</span>

						<span>
							{outcome.users.toLocaleString()}
							{outcome.users === 1 ? "predictor" : "predictors"}
						</span>

						<span>Returns {ratio(outcome.points).toFixed(2)}&times;</span>
					</Tooltip>
				</li>
			{/each}
		</ul>

		<p class="mt-1.5 text-xs text-muted-foreground">
			{prediction.totalPoints.toLocaleString()} points ·
			{prediction.totalUsers.toLocaleString()}
			{prediction.totalUsers === 1 ? "predictor" : "predictors"}
		</p>
	{/if}
</div>
