<script lang="ts">
	import { AutoScroller } from "@dnd-kit/dom";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { onMount } from "svelte";

	import { app } from "#lib/app.svelte.js";
	import ChannelIcon from "#lib/components/channel/ChannelIcon.svelte";
	import Sidebar from "#lib/components/Sidebar.svelte";
	import Avatar from "#lib/components/ui/Avatar.svelte";
	import { dialogs, openDialog } from "#lib/dialog.js";
	import { onDragStart, onDragOver, onDragMove, onDragEnd } from "#lib/splits/events.js";
	import { storage } from "#lib/stores.js";
	import { updater } from "#lib/updater.svelte.js";

	const { children } = $props();

	onMount(async () => {
		await Promise.all([app.connect(), updater.check()]);
	});

	createHotkey("Mod+,", () => openDialog(dialogs.settings));
</script>

<DragDropProvider
	plugins={(defaults) => [
		...defaults,
		AutoScroller.configure({
			threshold: { x: 0, y: 0 },
		}),
	]}
	{onDragStart}
	{onDragOver}
	{onDragMove}
	{onDragEnd}
>
	<div class="flex grow overflow-hidden">
		{#if storage.state.user}
			<Sidebar />
		{/if}

		<main class={["grow overflow-hidden bg-accent/15", storage.state.user && "border-l"]}>
			{@render children()}
		</main>
	</div>

	<DragOverlay>
		{#snippet children(source)}
			{@const channel = app.channels.get(source.data.id)}
			{@const isTab = source.type === "tab"}

			{#if channel}
				{#if isTab}
					<div
						class="mx-auto flex max-w-max items-center gap-2 rounded bg-background px-2 py-1"
					>
						<Avatar
							class={["size-6", !channel.stream && "grayscale"]}
							src={channel.user.avatarUrl}
							alt={channel.user.displayName}
							width="150"
							height="150"
						/>

						<span class="text-sm font-medium">{channel.user.displayName}</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<ChannelIcon {channel} />
					</div>
				{/if}
			{/if}
		{/snippet}
	</DragOverlay>
</DragDropProvider>
