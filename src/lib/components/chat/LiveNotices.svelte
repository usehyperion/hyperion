<script lang="ts">
	import type { Chat } from "$lib/models/chat.svelte";
	import CaretLeft from "~icons/ph/caret-left";
	import CaretRight from "~icons/ph/caret-right";
	import { Button } from "../ui/button";
	import Pin from "./Pin.svelte";
	import Poll from "./Poll.svelte";
	import Prediction from "./Prediction.svelte";

	interface Notice {
		kind: "pin" | "poll" | "prediction";
		label: string;
	}

	interface Props {
		chat: Chat;
	}

	const { chat }: Props = $props();

	const notices = $derived.by<Notice[]>(() => {
		const list: Notice[] = [];

		if (chat.pinned && !chat.pinned.hidden) {
			list.push({ kind: "pin", label: "Pinned message" });
		}

		if (chat.channel.poll && !chat.channel.poll.hidden) {
			list.push({ kind: "poll", label: "Poll" });
		}

		if (chat.channel.prediction && !chat.channel.prediction.hidden) {
			list.push({ kind: "prediction", label: "Prediction" });
		}

		return list;
	});

	let index = $state(0);

	// Keep the active index within bounds as notices appear and disappear.
	$effect(() => {
		if (index > notices.length - 1) {
			index = Math.max(0, notices.length - 1);
		}
	});

	const active = $derived(notices[index]);

	function cycle(delta: number) {
		index = (index + delta + notices.length) % notices.length;
	}
</script>

{#if notices.length}
	<div
		class="absolute inset-x-2 top-2 z-10 overflow-hidden rounded-lg border bg-popover shadow-md"
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
					{#each notices as notice, i (notice.kind)}
						<button
							class={[
								"size-1.5 rounded-full transition-colors",
								i === index ? "bg-primary" : "bg-muted-foreground opacity-40",
							]}
							type="button"
							aria-label="Show {notice.label}"
							aria-current={i === index}
							onclick={() => (index = i)}
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

		{#if active?.kind === "pin" && chat.pinned}
			<Pin pin={chat.pinned} />
		{:else if active?.kind === "poll" && chat.channel.poll}
			<Poll poll={chat.channel.poll} />
		{:else if active?.kind === "prediction" && chat.channel.prediction}
			<Prediction prediction={chat.channel.prediction} />
		{/if}
	</div>
{/if}
