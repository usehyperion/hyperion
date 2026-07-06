<script lang="ts">
	import {
		AutoScroller,
		type DragEndEvent,
		type DragMoveEvent,
		type DragOverEvent,
		type DragStartEvent,
	} from "@dnd-kit/dom";
	import { move } from "@dnd-kit/helpers";
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

	function onDragStart(event: DragStartEvent) {
		const source = event.operation.source;
		if (!source) return;

		if (source.type === "tab") {
			app.splits.drag = { channelId: source.data.id, sourcePaneId: source.data.paneId };
		} else if (source.type === "channel") {
			app.splits.drag = { channelId: source.data.id, sourcePaneId: null };
		}
	}

	function onDragOver(event: DragOverEvent) {
		const { source, target } = event.operation;
		if (!source) return;

		if (source.type === "pinned") {
			if (target?.type === "pinned") {
				storage.state.pinned = move(storage.state.pinned, event);
			}

			return;
		}

		app.splits.updateDropTarget(
			target ? (target.data as { kind: string; paneId?: string }) : null,
			event.operation.position?.current,
		);
	}

	function onDragMove(event: DragMoveEvent) {
		// A pane is a single droppable, so moving between its edge zones does not
		// fire `dragover` — recompute the highlighted zone on every pointer move.
		if (event.operation.source?.type === "pinned") return;

		app.splits.updateDropTarget(
			event.operation.target
				? (event.operation.target.data as { kind: string; paneId?: string })
				: null,
			event.operation.position?.current,
		);
	}

	function onDragEnd(event: DragEndEvent) {
		const target = event.operation.target;
		const drag = app.splits.drag;
		const point = event.operation.position?.current;

		app.splits.drag = null;
		app.splits.dropTarget = null;

		if (event.operation.canceled || !drag || !target) return;

		const data = target.data as { kind: string; paneId?: string; index?: number };
		const paneId = data.paneId;
		if (!paneId) return;

		// Dropping a tab back onto its own single-tab pane is a no-op.
		const sameSole =
			drag.sourcePaneId === paneId && (app.splits.pane(paneId)?.tabs.length ?? 0) <= 1;

		if (data.kind === "pane") {
			if (sameSole) return;

			const zone = app.splits.zoneForPane(paneId, point);
			app.splits.dropIntoZone(drag.channelId, paneId, zone);
		} else if (data.kind === "tab") {
			if (drag.sourcePaneId === paneId) {
				app.splits.reorderTab(drag.channelId, paneId, data.index ?? 0);
			} else {
				app.splits.moveTabToPane(drag.channelId, paneId, data.index);
			}
		} else if (data.kind === "tabbar") {
			if (drag.sourcePaneId === paneId) {
				const length = app.splits.pane(paneId)?.tabs.length ?? 0;
				app.splits.reorderTab(drag.channelId, paneId, length);
			} else {
				app.splits.moveTabToPane(drag.channelId, paneId);
			}
		}
	}

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
