<script lang="ts">
	import { createDraggable, createDroppable } from "@dnd-kit/svelte";
	import Layout from "~icons/ph/layout";
	import { app } from "$lib/app.svelte";
	import Channel from "$lib/components/Channel.svelte";
	import * as Empty from "$lib/components/ui/empty";
	import SplitHeader from "./SplitHeader.svelte";

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const draggable = $derived(
		createDraggable({
			id: `${id}:${crypto.randomUUID()}`,
		}),
	);

	const dropCenter = $derived(createDroppable({ id: `${id}:center` }));
	const dropUp = $derived(createDroppable({ id: `${id}:up` }));
	const dropDown = $derived(createDroppable({ id: `${id}:down` }));
	const dropLeft = $derived(createDroppable({ id: `${id}:left` }));
	const dropRight = $derived(createDroppable({ id: `${id}:right` }));

	const channel = $derived(app.channels.get(id));

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

<div class="relative flex size-full flex-col" onfocusin={setFocus} {@attach draggable.attach}>
	<SplitHeader {id} attachHandle={draggable.attachHandle} />

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative h-full" onclick={setFocus}>
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
				"bg-primary/50 pointer-events-none absolute z-20 size-full brightness-50 transition-all duration-75 ease-out",
				activeClass ? "opacity-100" : "opacity-0",
				activeClass,
			]}
		></div>

		{@render dropZone(dropCenter, "inset-0")}

		{#if channel}
			{@render dropZone(dropUp, "top-0 inset-x-0 h-1/3")}
			{@render dropZone(dropDown, "bottom-0 inset-x-0 h-1/3")}
			{@render dropZone(dropLeft, "left-0 inset-y-0 w-1/3")}
			{@render dropZone(dropRight, "right-0 inset-y-0 w-1/3")}
		{/if}
	</div>
</div>

{#snippet dropZone(dropper: ReturnType<typeof createDroppable>, className: string)}
	<div
		class={["pointer-events-none absolute z-10 flex", className]}
		{@attach dropper.attach}
	></div>
{/snippet}
