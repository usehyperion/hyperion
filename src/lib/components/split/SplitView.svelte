<script lang="ts">
	import { createDroppable } from "@dnd-kit/svelte";
	import { app } from "$lib/app.svelte";
	import * as Empty from "$lib/components/ui/empty";
	import type { Pane } from "$lib/splits/types";
	import Layout from "~icons/ph/layout";
	import Channel from "../channel/Channel.svelte";
	import TabBar from "./TabBar.svelte";

	interface Props {
		pane: Pane;
	}

	const { pane }: Props = $props();

	const channel = $derived(pane.active ? app.channels.get(pane.active) : null);

	const droppable = createDroppable({
		get id() {
			return `pane:${pane.id}`;
		},
		get type() {
			return "pane";
		},
		get accept() {
			return ["tab", "channel"];
		},
		get data() {
			return { kind: "pane", paneId: pane.id };
		},
	});

	function trackElement(node: HTMLElement) {
		app.splits.registerPaneElement(pane.id, node);
		return () => app.splits.unregisterPaneElement(pane.id, node);
	}

	const activeZone = $derived(
		app.splits.dropTarget?.paneId === pane.id ? app.splits.dropTarget.zone : null,
	);

	const overlayClass = $derived.by(() => {
		switch (activeZone) {
			case "left":
				return "top-0 left-0 w-1/2 h-full";
			case "right":
				return "top-0 left-1/2 w-1/2 h-full";
			case "top":
				return "top-0 left-0 w-full h-1/2";
			case "bottom":
				return "top-1/2 left-0 w-full h-1/2";
			case "center":
				return "inset-0 size-full";
			default:
				return null;
		}
	});

	function setFocus() {
		app.splits.focusedPaneId = pane.id;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative flex size-full flex-col" onfocusin={setFocus} onpointerdowncapture={setFocus}>
	<TabBar {pane} />

	<div class="relative h-full min-h-0">
		<div class="h-full">
			{#if channel}
				{#key channel.id}
					<Channel {channel} />
				{/key}
			{:else}
				<Empty.Root class="h-full">
					<Empty.Header>
						<Empty.Media variant="icon">
							<Layout />
						</Empty.Media>

						<Empty.Title>Empty split</Empty.Title>

						<Empty.Description>
							Drag a tab or channel here, or click a channel to open it.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{/if}
		</div>

		<div
			class="pointer-events-none absolute inset-0 z-10"
			{@attach droppable.attach}
			{@attach trackElement}
			aria-hidden="true"
		></div>

		<div
			class={[
				"pointer-events-none absolute z-20 bg-primary/50 brightness-50 transition-all duration-75 ease-out",
				overlayClass ? "opacity-100" : "opacity-0",
				overlayClass ?? "inset-0",
			]}
		></div>
	</div>
</div>
