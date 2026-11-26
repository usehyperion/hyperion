<script lang="ts">
	import { createDroppable } from "@dnd-kit/svelte";

	import type { Pane } from "#lib/splits/types.js";

	import { app } from "#lib/app.svelte.js";
	import ButtonGroup, { type ButtonGroupItem } from "#lib/components/ui/ButtonGroup.svelte";
	import { IconClose, IconSplitDown, IconSplitRight } from "#lib/icons.js";

	import Tab from "./Tab.svelte";

	interface Props {
		pane: Pane;
	}

	const { pane }: Props = $props();

	const showDropIndicator = $derived(
		app.splits.dropTarget?.paneId === pane.id && app.splits.dropTarget.zone === "tab-bar",
	);

	const actions: ButtonGroupItem[] = [
		{
			label: "Split right",
			icon: IconSplitRight,
			onclick: () => app.splits.split(pane.id, "right"),
		},
		{
			label: "Split down",
			icon: IconSplitDown,
			onclick: () => app.splits.split(pane.id, "down"),
		},
		{
			label: "Close split",
			icon: IconClose,
			onclick: () => app.closePane(pane.id),
		},
	];

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
</script>

<div class="tab-bar flex h-8 shrink-0 items-center border-b bg-surface-1" data-slot="tab-bar">
	<div
		class="flex h-full min-w-0 grow scrollbar-none items-stretch overflow-x-auto"
		role="tablist"
		tabindex="-1"
		{@attach droppable.attach}
	>
		{#each pane.tabs as tab, index (tab.id)}
			<Tab id={tab.id} {index} paneId={pane.id} active={pane.active === tab.id} />
		{/each}

		{#if showDropIndicator}
			<div class="w-0.5 shrink-0 self-stretch bg-fg" aria-hidden="true"></div>
		{/if}
	</div>

	<div class="flex shrink-0 items-center gap-x-1 px-1 text-fg-muted">
		<ButtonGroup items={actions} size="sm" aria-label="Pane actions" />
	</div>
</div>

<style>
	[data-slot="tab-bar"] :global(button:hover) {
		color: var(--color-fg);
	}
</style>
