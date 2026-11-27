<script lang="ts">
	import { createDraggable, createDroppable } from "@dnd-kit/svelte";

	import { app } from "#lib/app.svelte.js";
	import { IconClose } from "#lib/icons.js";

	interface Props {
		id: string;
		index: number;
		paneId: string;
		active: boolean;
	}

	const { id, index, paneId, active }: Props = $props();

	const channel = $derived(app.channels.get(id));

	const draggable = createDraggable({
		type: "tab",
		get id() {
			return `tab:${id}`;
		},
		get data() {
			return { kind: "tab", id, paneId };
		},
	});

	const droppable = createDroppable({
		type: "tab",
		accept: ["tab", "channel"],
		get id() {
			return `tabdrop:${id}`;
		},
		get data() {
			return { kind: "tab", id, paneId, index };
		},
	});

	async function close(event: Event) {
		event.stopPropagation();
		await app.closeTab(id);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class={[
		"tab group flex h-full max-w-48 shrink-0 items-center gap-x-1.5 border-r px-2 text-body select-none",
		active ? "bg-surface-0 text-fg" : "text-fg-muted hover:bg-surface-0/50 hover:text-fg",
		draggable.isDragging && "opacity-50",
		droppable.isDropTarget && "shadow-[inset_2px_0_0_var(--color-fg)]",
	]}
	role="tab"
	tabindex="-1"
	data-drop-target={droppable.isDropTarget || undefined}
	aria-selected={active}
	onclick={() => app.activate(id)}
	onauxclick={(event) => event.button === 1 && close(event)}
	{@attach draggable.attach}
	{@attach droppable.attach}
>
	{#if channel}
		<img
			class="tab-avatar size-4 shrink-0 rounded-full"
			src={channel.user.avatarUrl}
			alt=""
			width="150"
			height="150"
			draggable="false"
		/>

		<span class="truncate">{channel.user.displayName}</span>
	{:else}
		<span class="truncate">{id}</span>
	{/if}

	<button
		class={[
			"tab-close ml-auto flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-surface-2",
			!active && "opacity-0 group-hover:opacity-100",
		]}
		aria-label="Close tab"
		onclick={close}
	>
		<IconClose class="size-3" />
	</button>
</div>
