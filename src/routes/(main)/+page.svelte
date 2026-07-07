<script lang="ts">
	import { createHotkey, createHotkeys } from "@tanstack/svelte-hotkeys";
	import { onMount } from "svelte";
	import { app } from "$lib/app.svelte";
	import JoinDialog from "$lib/components/JoinDialog.svelte";
	import SplitNode from "$lib/components/split/SplitNode.svelte";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Empty from "$lib/components/ui/empty";
	import { settings } from "$lib/settings";
	import { createPane, firstLeaf } from "$lib/splits/tree";
	import type { SplitDirection } from "$lib/splits/types";
	import { storage } from "$lib/stores";
	import ChatDots from "~icons/ph/chat-dots";
	import Spinner from "~icons/ph/spinner";

	let loading = $state(true);

	onMount(async () => {
		if (app.user && !app.user.emoteSets.size) {
			await app.user.fetchEmoteSets();
		}

		if (storage.state.layout) {
			const pane = firstLeaf(storage.state.layout);
			app.splits.focusedPaneId = pane.id;

			const channel = pane.active ? app.channels.get(pane.active) : undefined;
			if (channel) await app.open(channel);
		}

		loading = false;
	});

	createHotkey("Mod+T", () => {
		if (settings.state["advanced.singleConnection"]) return;

		if (app.splits.focused) {
			app.splits.split(app.splits.focused.id, "horizontal");
		} else {
			app.splits.root = createPane();
		}
	});

	createHotkey("Mod+W", async () => {
		const pane = app.splits.focused;

		if (!pane) {
			if (app.focused) {
				const channel = app.focused;
				await channel.leave();
				app.focused = null;
			}

			return;
		}

		if (pane.active) {
			const tabId = pane.active;
			app.splits.closeTab(tabId);

			const channel = app.channels.get(tabId);

			if (settings.state["splits.leaveOnClose"]) {
				await channel?.leave();
			}

			if (app.focused === channel) {
				app.focused = pane.active ? (app.channels.get(pane.active) ?? null) : null;
			}
		} else {
			app.splits.closePane(pane.id);
		}
	});

	createHotkeys([
		{ hotkey: "Mod+Tab", callback: () => navigateTabs(1) },
		{ hotkey: "Mod+Shift+Tab", callback: () => navigateTabs(-1) },
	]);

	createHotkeys([
		{ hotkey: "Mod+ArrowUp", callback: () => navigateSplit("up") },
		{ hotkey: "Mod+ArrowDown", callback: () => navigateSplit("down") },
		{ hotkey: "Mod+ArrowLeft", callback: () => navigateSplit("left") },
		{ hotkey: "Mod+ArrowRight", callback: () => navigateSplit("right") },
	]);

	async function navigateTabs(offset: number) {
		const pane = app.splits.focused;
		if (!pane?.active || pane.tabs.length < 2) return;

		const index = pane.tabs.indexOf(pane.active);
		const next = pane.tabs[(index + offset + pane.tabs.length) % pane.tabs.length];

		const channel = app.channels.get(next);
		if (channel) {
			await app.open(channel);
		} else {
			app.splits.activate(next);
		}
	}

	function navigateSplit(direction: SplitDirection) {
		if (!app.splits.focusedPane) return;

		const paneId = app.splits.navigate(app.splits.focusedPaneId, direction);
		if (!paneId) return;

		app.splits.focusedPaneId = paneId;

		const pane = app.splits.pane(paneId);
		const channel = pane?.active ? app.channels.get(pane.active) : undefined;
		channel?.chat.input?.focus();
	}
</script>

<div class="h-full">
	{#if app.splits.root}
		<SplitNode node={app.splits.root} />
	{:else if loading}
		<div class="flex size-full flex-col items-center justify-center">
			<Spinner class="size-6 animate-spin" />
			<span class="mt-2 text-lg font-medium">Loading</span>
		</div>
	{:else}
		<Empty.Root class="h-full">
			<Empty.Header>
				<Empty.Media variant="icon">
					<ChatDots />
				</Empty.Media>

				<Empty.Title>No channel selected</Empty.Title>

				<Empty.Description>
					Select a channel from your following list or search for a channel to start
					chatting.
				</Empty.Description>
			</Empty.Header>

			<Empty.Content>
				<JoinDialog class={buttonVariants()}>Search channels</JoinDialog>
			</Empty.Content>
		</Empty.Root>
	{/if}
</div>
