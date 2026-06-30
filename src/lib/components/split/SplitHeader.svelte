<script lang="ts">
	import { tick } from "svelte";
	import type { Attachment } from "svelte/attachments";
	import { app } from "$lib/app.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import { settings } from "$lib/settings";
	import { emptyPaneId, isEmptyPaneId } from "$lib/split-layout";
	import { storage } from "$lib/stores";
	import DotsSix from "~icons/ph/dots-six";
	import SquareHalfBottom from "~icons/ph/square-half-bottom-fill";
	import SquareHalf from "~icons/ph/square-half-fill";
	import X from "~icons/ph/x";
	import GuestList from "../stream/GuestList.svelte";

	interface Props {
		id: string;
		attachHandle?: Attachment<HTMLElement>;
	}

	const { id, attachHandle }: Props = $props();

	const channel = $derived(app.channels.get(id));

	async function closeSplit(event: MouseEvent) {
		const preserve =
			settings.state["splits.closeBehavior"] === "preserve" &&
			!isEmptyPaneId(id) &&
			!event.shiftKey;

		if (app.splits.root === id) {
			app.splits.root = null;

			await tick();
			await storage.saveNow();

			if (settings.state["splits.leaveOnClose"]) {
				await channel?.leave();
			}

			return;
		}

		if (preserve) {
			app.splits.replace(id, emptyPaneId());
		} else {
			app.splits.remove(id);
		}

		if (settings.state["splits.leaveOnClose"]) {
			await channel?.leave();
		}
	}
</script>

<div class="flex items-center justify-between border-b bg-sidebar p-1" data-slot="split-header">
	<div class="flex h-full shrink-0 items-center gap-x-2 overflow-hidden px-1">
		{#if channel}
			<img
				class="size-5 rounded-full"
				src={channel.user.avatarUrl}
				alt={channel.user.displayName}
				width="150"
				height="150"
				draggable="false"
			/>

			<span class="truncate text-sm font-medium select-none">{channel.user.displayName}</span>

			{#if channel.stream?.guests.size}
				<GuestList {channel} />
			{/if}
		{/if}
	</div>

	<div class="cursor-grab active:cursor-grabbing" {@attach attachHandle}>
		<DotsSix />
	</div>

	<div class="flex shrink-0 items-center gap-x-1 text-muted-foreground">
		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			onclick={() => {
				app.splits.insertEmpty(id, "horizontal");
			}}
		>
			<SquareHalf />
		</Button>

		<Button
			class="size-min p-1"
			size="icon-sm"
			variant="ghost"
			onclick={() => {
				app.splits.insertEmpty(id, "vertical");
			}}
		>
			<SquareHalfBottom />
		</Button>

		<Button class="size-min p-1" size="icon-sm" variant="ghost" onclick={closeSplit}>
			<X />
		</Button>
	</div>
</div>

<style>
	[data-slot="split-header"] :global(button:hover) {
		color: var(--color-foreground);
	}
</style>
