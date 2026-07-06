<script lang="ts">
	import { AutoScroller } from "@dnd-kit/dom";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { ask } from "@tauri-apps/plugin-dialog";
	import { relaunch } from "@tauri-apps/plugin-process";
	import { check } from "@tauri-apps/plugin-updater";
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import StreamInfo from "$lib/components/StreamInfo.svelte";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { onDragStart, onDragOver, onDragMove, onDragEnd } from "$lib/splits/events";
	import { storage } from "$lib/stores";

	const { children } = $props();

	onMount(async () => {
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

	createHotkey("Mod+,", async () => {
		await goto(resolve("/settings"));
	});
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
	<Tooltip.Provider delayDuration={100}>
		<div class="flex grow overflow-hidden">
			{#if storage.state.user}
				<Sidebar />
			{/if}

			<main class={["grow overflow-hidden bg-accent/15", storage.state.user && "border-l"]}>
				{@render children()}
			</main>
		</div>
	</Tooltip.Provider>

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
								"size-6 rounded-full object-cover",
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
