<script lang="ts">
	import { AutoScroller } from "@dnd-kit/dom";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { ask } from "@tauri-apps/plugin-dialog";
	import { relaunch } from "@tauri-apps/plugin-process";
	import { check } from "@tauri-apps/plugin-updater";
	import { onDestroy, onMount } from "svelte";

	import { app } from "$lib/app.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import StreamInfo from "$lib/components/stream/StreamInfo.svelte";
	import { openDialog } from "$lib/components/ui/Dialog.svelte";
	import { onDragStart, onDragOver, onDragMove, onDragEnd } from "$lib/splits/events";
	import { storage } from "$lib/stores";
	import { serveUserCards } from "$lib/user-cards";

	const { children } = $props();

	let stopServingUserCards: (() => void) | undefined;

	onMount(async () => {
		// The main window owns the chat connections, so it is the only source
		// popouts can pull message history from.
		stopServingUserCards = await serveUserCards();

		await app.connect();

		const update = await check();
		if (!update) return;

		const install = await ask(
			`A new update is available. Would you like to install it now?`,
			"Update Available",
		);

		if (!install) return;

		await update.downloadAndInstall();

		const restart = await ask(
			`Update installed. Would you like to restart the app now?`,
			"Restart Required",
		);

		if (restart) {
			await relaunch();
		}
	});

	onDestroy(() => stopServingUserCards?.());

	createHotkey("Mod+,", () => openDialog("settings-dialog"));
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
						<img
							class={[
								"size-6 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10",
								!channel.stream && "grayscale",
							]}
							src={channel.user.avatarUrl}
							alt={channel.user.displayName}
							width="150"
							height="150"
						/>

						<span class="text-sm font-medium">{channel.user.displayName}</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<StreamInfo {channel} />
					</div>
				{/if}
			{/if}
		{/snippet}
	</DragOverlay>
</DragDropProvider>
