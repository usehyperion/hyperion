<script lang="ts">
	import type { Snippet } from "svelte";

	import CaretLeft from "~icons/ph/caret-left";
	import CaretRight from "~icons/ph/caret-right";

	import type { Chat } from "#lib/models/chat.svelte.js";
	import type { Notice } from "#lib/models/notice.svelte.js";
	import type { Pin as PinModel } from "#lib/models/pin.svelte.js";
	import type { Poll as PollModel } from "#lib/models/poll.svelte.js";
	import type { Prediction as PredictionModel } from "#lib/models/prediction.svelte.js";

	import Button from "../ui/Button.svelte";
	import Pin from "./Pin.svelte";
	import Poll from "./Poll.svelte";
	import Prediction from "./Prediction.svelte";

	interface Props {
		chat: Chat;
	}

	const { chat }: Props = $props();

	let selected = $state(0);

	const notices = $derived(
		[
			entry("Pinned message", chat.pinned, pinNotice),
			entry("Poll", chat.channel.poll, pollNotice),
			entry("Prediction", chat.channel.prediction, predictionNotice),
		].filter((notice) => notice !== null),
	);

	const index = $derived(Math.min(selected, Math.max(0, notices.length - 1)));
	const active = $derived(notices.at(index));

	function entry<T extends Notice>(label: string, notice: T | null, render: Snippet<[T]>) {
		if (!notice || notice.hidden) return null;

		return {
			label,
			notice,
			render: render as Snippet<[Notice]>,
		};
	}

	function cycle(delta: number) {
		selected = (index + delta + notices.length) % notices.length;
	}
</script>

{#if notices.length}
	<div
		class="absolute inset-x-2 top-2 z-10 overflow-hidden rounded-lg bg-popover smooth-shadow-ring-md"
	>
		{#if notices.length > 1}
			<div class="flex items-center gap-1 border-b px-1 py-0.5 text-xs text-muted-foreground">
				<Button
					class="size-5"
					size="icon-sm"
					variant="ghost"
					aria-label="Previous notice"
					onclick={() => cycle(-1)}
				>
					<CaretLeft class="size-3.5" />
				</Button>

				<span class="truncate">{active?.label}</span>

				<div class="ml-auto flex items-center gap-1">
					{#each notices as notice, i (notice.label)}
						<button
							class={[
								"size-1.5 rounded-full transition-colors",
								i === index ? "bg-primary" : "bg-muted-foreground opacity-40",
							]}
							type="button"
							aria-label="Show {notice.label}"
							aria-current={i === index}
							onclick={() => (selected = i)}
						></button>
					{/each}

					<span class="ml-0.5 tabular-nums">{index + 1}/{notices.length}</span>
				</div>

				<Button
					class="size-5"
					size="icon-sm"
					variant="ghost"
					aria-label="Next notice"
					onclick={() => cycle(1)}
				>
					<CaretRight class="size-3.5" />
				</Button>
			</div>
		{/if}

		{#if active}
			{@render active.render(active.notice)}
		{/if}
	</div>
{/if}

{#snippet pinNotice(pin: PinModel)}
	<Pin {pin} />
{/snippet}

{#snippet pollNotice(poll: PollModel)}
	<Poll {poll} />
{/snippet}

{#snippet predictionNotice(prediction: PredictionModel)}
	<Prediction {prediction} />
{/snippet}
