<script lang="ts">
	import { createSortable } from "@dnd-kit/svelte/sortable";
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

	const sortable = createSortable({
		get id() {
			return tabId;
		},
		get index() {
			return index;
		},
		get group() {
			return paneId;
		},
		get type() {
			return "tab";
		},
		get accept() {
			return ["tab"];
		},
		get data() {
			return { kind: "tab", id: tabId, paneId };
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
		sortable.isDragging && "opacity-50",
	]}
	role="tab"
	tabindex="-1"
	aria-selected={active}
	onclick={select}
	onauxclick={(event) => event.button === 1 && close(event)}
	{@attach sortable.attach}
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
