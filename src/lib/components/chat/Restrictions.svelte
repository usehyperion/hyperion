<script lang="ts">
	import type { Chat } from "#lib/models/chat.svelte.js";

	import { formatDuration } from "#lib/util/time.js";

	import Popover from "../ui/Popover.svelte";

	interface Props {
		chat: Chat;
	}

	const { chat }: Props = $props();

	// Ordered by precedence; the first active mode is shown in the input.
	const modes = $derived.by(() => {
		const { mode } = chat;

		return [
			{
				label: "Subscriber only",
				active: mode.subOnly,
				seconds: 0,
			},
			{
				label: "Follower only",
				active: mode.followerOnly !== null,
				seconds: (mode.followerOnly ?? 0) * 60,
			},
			{
				label: "Slow mode",
				active: mode.slow > 0,
				seconds: mode.slow,
			},
			{
				label: "Unique messages",
				active: mode.unique,
				seconds: 0,
			},
			{
				label: "Emote only",
				active: mode.emoteOnly,
				seconds: 0,
			},
		];
	});

	const topMostActive = $derived(modes.find((m) => m.active));
</script>

<Popover class="w-max p-2 text-xs" aria-label="Chat restrictions">
	{#snippet trigger(props)}
		<button
			{...props}
			class={["flex items-center control-focus", topMostActive && "text-green-500"]}
		>
			<div class="mr-1 size-1.5 rounded-full bg-current/50"></div>

			<span class="text-xs">
				{topMostActive?.label ?? "No chat restrictions"}
			</span>
		</button>
	{/snippet}

	<ul class="space-y-1">
		{#each modes as mode (mode.label)}
			<li class={["flex items-center", mode.active ? "text-green-500" : "text-fg-muted"]}>
				<div class="mr-1 size-1.5 rounded-full bg-current/50"></div>

				{mode.label}

				{#if mode.seconds > 0}
					({formatDuration(mode.seconds)})
				{/if}
			</li>
		{/each}
	</ul>
</Popover>
