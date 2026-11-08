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
			{ label: "Subscriber only", active: mode.subOnly, seconds: 0 },
			{
				label: "Follower only",
				active: mode.followerOnly !== null,
				seconds: (mode.followerOnly ?? 0) * 60,
			},
			{ label: "Slow mode", active: mode.slow > 0, seconds: mode.slow },
			{ label: "Unique messages", active: mode.unique, seconds: 0 },
			{ label: "Emote only", active: mode.emoteOnly, seconds: 0 },
		];
	});

	const topMostActive = $derived(modes.find((m) => m.active));
</script>

<button
	class={["flex items-center", topMostActive && "text-green-500"]}
	popovertarget="restrictions-{chat.channel.id}"
>
	<div class="mr-1 size-1.5 rounded-full bg-current/50"></div>

	<span class="text-xs">
		{topMostActive?.label ?? "No chat restrictions"}
	</span>
</button>

<Popover id="restrictions-{chat.channel.id}" class="w-max p-3 text-xs">
	<ul class="space-y-1">
		{#each modes as mode (mode.label)}
			<li
				class={[
					"flex items-center",
					mode.active ? "text-green-500" : "text-muted-foreground",
				]}
			>
				<div class="mr-1 size-1.5 rounded-full bg-current/50"></div>

				{mode.label}

				{#if mode.seconds > 0}
					({formatDuration(mode.seconds)})
				{/if}
			</li>
		{/each}
	</ul>
</Popover>
