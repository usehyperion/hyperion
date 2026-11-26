<script lang="ts">
	import type { Prediction } from "#lib/models/prediction.svelte.js";

	import { everySecond } from "#lib/clock.js";
	import {
		IconCancelPrediction,
		IconLockPrediction,
		IconPrediction,
		IconWinner,
	} from "#lib/icons.js";
	import { duelColor } from "#lib/models/prediction.svelte.js";
	import { percent } from "#lib/util/math.js";
	import { formatDuration } from "#lib/util/time.js";

	import Meter from "../ui/Meter.svelte";
	import Tooltip from "../ui/Tooltip.svelte";
	import Username from "../user/Username.svelte";
	import NoticeAction, { details, hide } from "./NoticeAction.svelte";

	interface Props {
		prediction: Prediction;
	}

	const { prediction }: Props = $props();

	const DUEL = {
		BLUE: "bg-blue-500",
		PINK: "bg-pink-500",
	};

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

	const remaining = $derived(
		Math.max(0, Math.ceil((prediction.locksTimestamp - everySecond.now) / 1000)),
	);

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
		const duel = duelColor(index, prediction.outcomes.length);
		return duel ? DUEL[duel] : RAINBOW[index];
	}

	function ratio(points: number) {
		return points > 0 ? prediction.totalPoints / points : 0;
	}
</script>

<div class="p-2 text-body">
	<div class="mb-1 flex items-center gap-1 text-caption text-fg-muted">
		<IconPrediction class="size-3 shrink-0" />

		<span class="truncate">
			Prediction {#if prediction.creator}by <Username user={prediction.creator} />{/if}
		</span>

		<span class="ml-auto shrink-0 whitespace-nowrap">{status}</span>

		<div class="flex shrink-0 items-center gap-0.5">
			{#if prediction.channel.isMod}
				{#if prediction.status === "ACTIVE"}
					<NoticeAction
						icon={IconLockPrediction}
						tooltip="Lock prediction"
						onclick={() => prediction.lock()}
					/>
				{/if}

				{#if prediction.open}
					<NoticeAction
						icon={IconCancelPrediction}
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
				{@const pct = percent(outcome.points, prediction.totalPoints)}
				{@const won =
					prediction.status === "RESOLVED" && prediction.winningOutcomeId === outcome.id}
				{@const lost =
					prediction.status === "RESOLVED" && prediction.winningOutcomeId !== outcome.id}

				<li class="flex flex-col">
					<div class="mb-0.5 flex items-center gap-1.5">
						<span class="truncate">{outcome.title}</span>

						{#if won}
							<IconWinner class="size-3 shrink-0 text-warning" />
						{/if}

						<span
							class="ml-auto shrink-0 text-caption whitespace-nowrap text-fg-muted tabular-nums"
						>
							{pct}% ({outcome.points.toLocaleString()})
						</span>

						{#if prediction.channel.isMod && prediction.open}
							<NoticeAction
								icon={IconWinner}
								tooltip="Resolve as winner"
								onclick={() => prediction.resolve(outcome.id)}
							/>
						{/if}
					</div>

					<Tooltip class="flex flex-col gap-0.5">
						{#snippet trigger(props)}
							<Meter
								class={[lost && "opacity-25"]}
								value={pct}
								aria-label={outcome.title}
								indicatorClass={colorFor(i)}
								{...props}
							/>
						{/snippet}

						<span class="flex items-center gap-1 font-medium">
							<span class={["size-2 shrink-0 rounded-full", colorFor(i)]}></span>

							{outcome.title}

							{#if won}
								<IconWinner class="size-3 text-warning" />
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

		<p class="mt-1.5 text-caption text-fg-muted tabular-nums">
			{prediction.totalPoints.toLocaleString()} points ·
			{prediction.totalUsers.toLocaleString()}
			{prediction.totalUsers === 1 ? "predictor" : "predictors"}
		</p>
	{/if}
</div>
