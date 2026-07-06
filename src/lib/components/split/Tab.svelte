<script lang="ts">
	import { createDraggable, createDroppable } from "@dnd-kit/svelte";
	import { app } from "$lib/app.svelte";
	import { settings } from "$lib/settings";
	import X from "~icons/ph/x";

	interface Props {
		tabId: string;
		index: number;
		paneId: string;
		active: boolean;
	}

	const { tabId, index, paneId, active }: Props = $props();

	const channel = $derived(app.channels.get(tabId));

	const draggable = createDraggable({
		get id() {
			return `tab:${tabId}`;
		},
		get type() {
			return "tab";
		},
		get data() {
			return { kind: "tab", id: tabId, paneId };
		},
	});

	const droppable = createDroppable({
		get id() {
			return `tabdrop:${tabId}`;
		},
		get type() {
			return "tab";
		},
		get accept() {
			return ["tab", "channel"];
		},
		get data() {
			return { kind: "tab", id: tabId, paneId, index };
		},
	});

	async function select() {
		if (channel) {
			await app.open(channel);
		} else {
			app.splits.activate(tabId);
		}
	}

	async function close(event: Event) {
		event.stopPropagation();

		app.splits.closeTab(tabId);

		if (settings.state["splits.leaveOnClose"]) {
			await channel?.leave();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class={[
		"group flex h-full max-w-48 shrink-0 items-center gap-x-1.5 border-r px-2 text-sm select-none",
		active
			? "bg-background text-foreground"
			: "text-muted-foreground hover:bg-background/50 hover:text-foreground",
		draggable.isDragging && "opacity-50",
		droppable.isDropTarget && "shadow-[inset_2px_0_0_var(--color-primary)]",
	]}
	role="tab"
	tabindex="-1"
	aria-selected={active}
	onclick={select}
	onauxclick={(event) => event.button === 1 && close(event)}
	{@attach draggable.attach}
	{@attach droppable.attach}
>
	{#if channel}
		<img
			class="size-4 shrink-0 rounded-full"
			src={channel.user.avatarUrl}
			alt=""
			width="150"
			height="150"
			draggable="false"
		/>

		<span class="truncate">{channel.user.displayName}</span>
	{:else}
		<span class="truncate">{tabId}</span>
	{/if}

	<button
		class={[
			"ml-auto shrink-0 rounded-sm p-0.5 hover:bg-muted",
			!active && "opacity-0 group-hover:opacity-100",
		]}
		aria-label="Close tab"
		onclick={close}
	>
		<X class="size-3" />
	</button>
</div>
