<script lang="ts">
	import { createDroppable } from "@dnd-kit/svelte";
	import { app } from "$lib/app.svelte";
	import { Button } from "$lib/components/ui/button";
	import { settings } from "$lib/settings";
	import type { Pane } from "$lib/splits/types";
	import SquareHalfBottom from "~icons/ph/square-half-bottom-fill";
	import SquareHalf from "~icons/ph/square-half-fill";
	import X from "~icons/ph/x";
	import GuestList from "../GuestList.svelte";
	import Tab from "./Tab.svelte";

	interface Props {
		pane: Pane;
	}

	const { pane }: Props = $props();

	const channel = $derived(pane.active ? app.channels.get(pane.active) : undefined);

	const droppable = createDroppable({
		get id() {
			return `tabbar:${pane.id}`;
		},
		get type() {
			return "tabbar";
		},
		get accept() {
			return ["tab", "channel"];
		},
		get data() {
			return { kind: "tabbar", paneId: pane.id };
		},
	});

	async function closePane() {
		const tabs = [...pane.tabs];

		app.splits.closePane(pane.id);

		if (settings.state["splits.leaveOnClose"]) {
			await Promise.all(tabs.map((id) => app.channels.get(id)?.leave()));
		}
	}
</script>

<div class="flex h-8 shrink-0 items-center border-b bg-sidebar" data-slot="tab-bar">
	<div
		class="flex h-full min-w-0 grow items-stretch overflow-x-auto"
		role="tablist"
		tabindex="-1"
		{@attach droppable.attach}
	>
		{#each pane.tabs as tabId, index (tabId)}
			<Tab {tabId} {index} paneId={pane.id} active={pane.active === tabId} />
		{/each}
	</div>

	<div class="flex shrink-0 items-center gap-x-1 px-1 text-muted-foreground">
		{#if channel?.stream?.guests.size}
			<GuestList {channel} />
		{/if}

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			title="Split right"
			onclick={() => {
				app.splits.split(pane.id, "horizontal");
			}}
		>
			<SquareHalf />
		</Button>

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			title="Split down"
			onclick={() => {
				app.splits.split(pane.id, "vertical");
			}}
		>
			<SquareHalfBottom />
		</Button>

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			title="Close split"
			onclick={closePane}
		>
			<X />
		</Button>
	</div>
</div>

<style>
	[data-slot="tab-bar"] :global(button:hover) {
		color: var(--color-foreground);
	}
</style>
