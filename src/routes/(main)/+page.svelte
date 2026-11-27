<script lang="ts">
	import { createHotkey, createHotkeys } from "@tanstack/svelte-hotkeys";
	import { DialogTrigger } from "@ui-sdk/svelte/dialog";
	import { onMount } from "svelte";

	import type { SplitDirection } from "#lib/splits/types.js";

	import { app } from "#lib/app.svelte.js";
	import SplitNode from "#lib/components/split/SplitNode.svelte";
	import Button from "#lib/components/ui/Button.svelte";
	import Empty from "#lib/components/ui/Empty.svelte";
	import { dialogController, dialogs } from "#lib/dialog.js";
	import { IconChat, IconLoading } from "#lib/icons.js";
	import { createPane } from "#lib/splits/tree.js";

	let loading = $state(true);

	onMount(async () => {
		await app.user?.loadEmoteSets();
		await app.restoreLayout();

		loading = false;
	});

	createHotkey("Mod+T", () => {
		if (app.splits.focused) {
			app.splits.split(app.splits.focused.id, "right");
		} else {
			app.splits.root = createPane();
		}
	});

	createHotkey("Mod+W", async () => {
		const pane = app.splits.focused;
		if (!pane) return;

		if (pane.active) {
			await app.closeTab(pane.active);
		} else {
			await app.closePane(pane.id);
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

	async function navigateTabs(offset: 1 | -1) {
		const pane = app.splits.focused;
		if (!pane?.active || pane.tabs.length < 2) return;

		const index = pane.tabs.findIndex((tab) => tab.id === pane.active);
		if (index === -1) return;

		const next = pane.tabs[(index + offset + pane.tabs.length) % pane.tabs.length];

		if (next) {
			await app.activate(next.id);
		}
	}

	function navigateSplit(direction: SplitDirection) {
		if (!app.splits.focusedPaneId) return;

		const paneId = app.splits.navigate(app.splits.focusedPaneId, direction);
		if (!paneId) return;

		app.splits.focusedPaneId = paneId;
		app.focused?.chat.input?.focus();
	}
</script>

<div class="h-full">
	{#if app.splits.root}
		<SplitNode node={app.splits.root} />
	{:else if loading}
		<div class="flex size-full flex-col items-center justify-center">
			<IconLoading class="size-6 animate-spin" />
			<span class="mt-2 text-title font-medium">Loading</span>
		</div>
	{:else}
		<Empty
			class="home-empty h-full"
			icon={IconChat}
			title="No channel selected"
			description="Select a channel from your following list or search for a channel to start chatting."
		>
			<DialogTrigger controller={dialogController(dialogs.join)}>
				{#snippet render({ props })}
					<Button {...props}>Search channels</Button>
				{/snippet}
			</DialogTrigger>
		</Empty>
	{/if}
</div>
