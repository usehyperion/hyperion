<script lang="ts">
	import type { Chat } from "$lib/models/chat.svelte";
	import { formatDuration } from "$lib/util";
	import Popover from "../ui/Popover.svelte";

	interface Props {
		chat: Chat;
	}

	const { chat }: Props = $props();

	const config = [
		{ key: "subOnly", label: "Subscriber only" },
		{ key: "followerOnly", label: "Follower only" },
		{ key: "slow", label: "Slow mode" },
		{ key: "unique", label: "Unique messages" },
		{ key: "emoteOnly", label: "Emote only" },
	] as const;

	const modes = $derived(
		config.map((mode) => {
			const value = chat.mode[mode.key];
			const active =
				typeof value === "number"
					? mode.key === "followerOnly"
						? value >= 0
						: value > 0
					: value;

			return Object.assign({ active }, mode);
		}),
	);

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
		{#each modes as mode}
			<li
				class={[
					"flex items-center",
					mode.active ? "text-green-500" : "text-muted-foreground",
				]}
			>
				<div class="mr-1 size-1.5 rounded-full bg-current/50"></div>

				{mode.label}

				{#if mode.key === "followerOnly" && typeof chat.mode.followerOnly === "number" && chat.mode.followerOnly > 0}
					({formatDuration(chat.mode.followerOnly * 60)})
				{/if}

				{#if mode.key === "slow" && typeof chat.mode.slow === "number" && chat.mode.slow > 0}
					({formatDuration(chat.mode.slow)})
				{/if}
			</li>
		{/each}
	</ul>
</Popover>
