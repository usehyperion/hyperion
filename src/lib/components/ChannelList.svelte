<script lang="ts">
	import { onDestroy } from "svelte";
	import { flip } from "svelte/animate";
	import { app } from "$lib/app.svelte";
	import { getSidebarContext } from "$lib/context";
	import type { Channel } from "$lib/models/channel.svelte";
	import { settings } from "$lib/settings";
	import Draggable from "./Draggable.svelte";
	import DraggableChannel from "./DraggableChannel.svelte";
	import Droppable from "./Droppable.svelte";
	import { Separator } from "./ui/separator";

	const sidebar = getSidebarContext();

	const sorted = $derived(
		app.channels
			.values()
			.toArray()
			.sort((a, b) => {
				if (a.stream && b.stream) {
					return b.stream.viewers - a.stream.viewers;
				}

				if (a.stream && !b.stream) return -1;
				if (!a.stream && b.stream) return 1;

				return a.user.username.localeCompare(b.user.username);
			}),
	);

	const groups = $derived.by(() => {
		const pinnedChannels = sorted
			.filter((c) => c.pinned)
			.sort((a, b) => {
				const indexA = settings.state.pinned.indexOf(a.id);
				const indexB = settings.state.pinned.indexOf(b.id);

				return indexA - indexB;
			});

		const pinned = { type: "Pinned", channels: pinnedChannels };
		const ephemeral = { type: "Ephemeral", channels: [] as Channel[] };
		const online = { type: "Online", channels: [] as Channel[] };
		const offline = { type: "Offline", channels: [] as Channel[] };

		for (const channel of sorted) {
			if (channel.id === app.user?.id || channel.pinned) {
				continue;
			}

			if (channel.ephemeral) {
				ephemeral.channels.push(channel);
			} else if (channel.stream) {
				online.channels.push(channel);
			} else {
				offline.channels.push(channel);
			}
		}

		return [pinned, ephemeral, online, offline].filter((g) => g.channels.length);
	});

	const interval = setInterval(
		async () => {
			const ids = app.channels.keys().toArray();
			const streams = await app.twitch.fetchStreams(ids);

			for (const channel of app.channels.values()) {
				const stream = streams.find((s) => s.channelId === channel.user.id);
				channel.stream = stream ?? null;
			}
		},
		5 * 60 * 1000,
	);

	onDestroy(() => clearInterval(interval));
</script>

{#each groups as group}
	{#if sidebar.collapsed}
		<Separator />
	{:else}
		<span class="text-muted-foreground mt-2 inline-block px-2 text-xs font-semibold uppercase">
			{group.type}
		</span>
	{/if}

	{#if group.type === "Pinned"}
		{#key settings.state.pinned.length}
			<Droppable id="pinned-channels" class="space-y-1.5">
				{#each group.channels as channel, i (channel.user.id)}
					<Draggable {channel} index={i} />
				{/each}
			</Droppable>
		{/key}
	{:else}
		{#each group.channels as channel (channel.user.id)}
			<div animate:flip={{ duration: 500 }}>
				<DraggableChannel {channel} />
			</div>
		{/each}
	{/if}
{/each}
