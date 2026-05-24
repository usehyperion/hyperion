<script lang="ts">
	import { createDraggable, createDroppable } from "@dnd-kit/svelte";
	import { app } from "$lib/app.svelte";
	import Channel from "$lib/components/Channel.svelte";
	import * as Empty from "$lib/components/ui/empty";
	import { isEmptyPaneId, type SplitDropPosition } from "$lib/split-layout";
	import Layout from "~icons/ph/layout";
	import SplitHeader from "./SplitHeader.svelte";

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const channel = $derived(app.channels.get(id));

	const draggable = createDraggable({
		get id() {
			return `pane:${id}`;
		},
		get type() {
			return "pane";
		},
		get data() {
			return { kind: "pane", id };
		},
		get disabled() {
			return isEmptyPaneId(id);
		},
	});

	function makeZone(position: SplitDropPosition, edge: boolean) {
		return createDroppable({
			get id() {
				return `zone:${id}:${position}`;
			},
			get type() {
				return "split-zone";
			},
			get data() {
				return { paneId: id, position };
			},
			get disabled() {
				return edge && !channel;
			},
		});
	}

	const dropCenter = makeZone("center", false);
	const dropUp = makeZone("up", true);
	const dropDown = makeZone("down", true);
	const dropLeft = makeZone("left", true);
	const dropRight = makeZone("right", true);

	const activeClass = $derived.by(() => {
		if (dropUp.isDropTarget) return "top-0 left-0 w-full h-1/2";
		if (dropDown.isDropTarget) return "top-1/2 left-0 w-full h-1/2";
		if (dropLeft.isDropTarget) return "top-0 left-0 w-1/2 h-full";
		if (dropRight.isDropTarget) return "top-0 left-1/2 w-1/2 h-full";
		if (dropCenter.isDropTarget) return "top-0 left-0 size-full";
	});

	function setFocus() {
		app.splits.focused = id;
	}
</script>

<div class="relative flex size-full flex-col" onfocusin={setFocus}>
	<SplitHeader {id} attachHandle={draggable.attachHandle} />

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative h-full" onclick={setFocus} {@attach draggable.attach}>
		<div class={["h-full", draggable.isDragging && "opacity-50"]}>
			{#if channel}
				{#key channel.id}
					<Channel {channel} split />
				{/key}
			{:else}
				<Empty.Root class="h-full">
					<Empty.Header>
						<Empty.Media variant="icon">
							<Layout />
						</Empty.Media>

						<Empty.Title>Empty split</Empty.Title>

						<Empty.Description>
							Drag a channel from the channel list to add it as a split.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{/if}
		</div>

		<div
			class={[
				"pointer-events-none absolute z-20 bg-primary/50 brightness-50 transition-all duration-75 ease-out",
				activeClass ? "opacity-100" : "opacity-0",
				activeClass ?? "inset-0",
			]}
		></div>

		<div class="pointer-events-none absolute inset-0 z-10" {@attach dropCenter.attach}></div>
		<div class="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/4" {@attach dropUp.attach}
		></div>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4"
			{@attach dropDown.attach}
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4"
			{@attach dropLeft.attach}
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 z-10 w-1/4"
			{@attach dropRight.attach}
		></div>
	</div>
</div>
