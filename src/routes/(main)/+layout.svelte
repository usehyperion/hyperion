<script lang="ts">
	import { AutoScroller } from "@dnd-kit/dom";
	import { move } from "@dnd-kit/helpers";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
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
	import { storage } from "$lib/stores";

	const { children } = $props();

	onMount(async () => {
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
</script>

<svelte:window
	onkeydown={async (event) => {
		if ((event.metaKey || event.ctrlKey) && event.key === ",") {
			event.preventDefault();
			await goto(resolve("/settings"));
		}
	}}
/>

<DragDropProvider
	plugins={(defaults) => [
		...defaults,
		AutoScroller.configure({
			threshold: { x: 0, y: 0 },
		}),
	]}
	onDragOver={(event) => {
		const source = event.operation.source;
		const target = event.operation.target;
		if (!source || !target) return;

		if (source.type === "pinned" && target.type === "pinned") {
			storage.state.pinned = move(storage.state.pinned, event);
		}
	}}
	onDragEnd={(event) => {
		const target = event.operation.target;

		if (target?.type === "split-zone") {
			app.splits.handleDragEnd(event);
		}
	}}
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
			{@const isPane = source.data.kind === "pane"}

			{#if channel}
				<div
					class={[
						"flex items-center gap-2 px-2 py-1",
						isPane && "max-w-max rounded bg-background",
					]}
				>
					<StreamInfo {channel} />

					{#if isPane}
						<span class="text-sm font-medium">{channel.user.displayName}</span>
					{/if}
				</div>
			{/if}
		{/snippet}
	</DragOverlay>
</DragDropProvider>
