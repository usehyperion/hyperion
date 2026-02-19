<script lang="ts">
	import {
		Accessibility,
		Cursor,
		Feedback,
		PreventSelection,
		Scroller,
		ScrollListener,
	} from "@dnd-kit/dom";
	import { move } from "@dnd-kit/helpers";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { storage } from "$lib/stores";

	const { children } = $props();
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
	plugins={[
		// It doesn't seem like there's currently a way to disable the
		// AutoScroller plugin other than not including it.
		// https://github.com/clauderic/dnd-kit/issues/1790
		Accessibility,
		Cursor,
		Feedback,
		PreventSelection,
		Scroller,
		ScrollListener,
	]}
	onDragOver={(event) => {
		if (event.operation.target?.id === "pinned-channels") {
			storage.state.pinned = move(storage.state.pinned, event);
		}
	}}
	onDragEnd={(event) => {
		app.splits.handleDragEnd(event);
	}}
>
	<Tooltip.Provider delayDuration={100}>
		<div class="flex grow overflow-hidden">
			{#if storage.state.user}
				<Sidebar />
			{/if}

			<main class={["bg-accent/15 grow overflow-hidden", storage.state.user && "border-l"]}>
				{@render children()}
			</main>
		</div>
	</Tooltip.Provider>

	<DragOverlay>
		{#snippet children(source)}
			{@const [id] = source.id.toString().split(":")}
			{@const channel = app.channels.get(id)}

			<div class="bg-muted/90 flex w-44 items-center justify-center gap-x-1 rounded-md py-2">
				{#if channel}
					<img
						src={channel.user.avatarUrl}
						alt={channel.user.username}
						class="size-5 rounded-full object-cover"
					/>
				{/if}

				<span class="text-sm font-medium">{channel?.user.displayName ?? "Empty"}</span>
			</div>
		{/snippet}
	</DragOverlay>
</DragDropProvider>
