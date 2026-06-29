<script lang="ts">
	import { createDroppable } from "@dnd-kit/svelte";
	import { app } from "$lib/app.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import { settings } from "$lib/settings";
	import type { Pane } from "$lib/splits/types";
	import SquareHalfBottom from "~icons/ph/square-half-bottom-fill";
	import SquareHalf from "~icons/ph/square-half-fill";
	import X from "~icons/ph/x";
	import GuestList from "../stream/GuestList.svelte";
	import Tab from "./Tab.svelte";

	interface Props {
		pane: Pane;
	}

	const { pane }: Props = $props();

	const channel = $derived(pane.active ? app.channels.get(pane.active) : undefined);

	const showDropIndicator = $derived(
		app.splits.dropTarget?.paneId === pane.id && app.splits.dropTarget.zone === "tab-bar",
	);

	const droppable = createDroppable({
		type: "tab-bar",
		accept: ["tab", "channel"],
		get id() {
			return `tab-bar:${pane.id}`;
		},
		get data() {
			return { kind: "tab-bar", paneId: pane.id };
		},
	});

	async function closePane() {
		const tabs = [...pane.tabs];

		app.splits.closePane(pane.id);
		app.refocus(channel);

		if (settings.state["splits.leaveOnClose"]) {
			await Promise.all(tabs.map((id) => app.channels.get(id)?.leave()));
		}
	}
</script>

<div class="flex h-8 shrink-0 items-center border-b bg-sidebar" data-slot="tab-bar">
	<div
		class="flex h-full min-w-0 grow scrollbar-none items-stretch overflow-x-auto"
		role="tablist"
		tabindex="-1"
		{@attach droppable.attach}
	>
		{#each pane.tabs as tabId, index (tabId)}
			<Tab id={tabId} {index} paneId={pane.id} active={pane.active === tabId} />
		{/each}

		{#if showDropIndicator}
			<div class="w-0.5 shrink-0 self-stretch bg-primary" aria-hidden="true"></div>
		{/if}
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
				app.splits.split(pane.id, "right");
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
				app.splits.split(pane.id, "down");
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
