<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import SquareHalfBottom from "~icons/ph/square-half-bottom-fill";
	import SquareHalf from "~icons/ph/square-half-fill";
	import X from "~icons/ph/x";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import { Button } from "$lib/components/ui/button";
	import { settings } from "$lib/settings";
	import { SplitLayout } from "$lib/split-layout";

	interface Props {
		id: string;
		attachHandle?: Attachment<HTMLElement>;
	}

	const { id, attachHandle }: Props = $props();

	const channel = $derived(app.channels.get(id));

	async function closeSplit(event: MouseEvent) {
		const preserve =
			settings.state["splits.closeBehavior"] === "preserve" &&
			!id.startsWith("split-") &&
			!event.shiftKey;

		if (app.splits.root === id || id === SplitLayout.EMPTY_ROOT_ID) {
			if (preserve) {
				app.splits.remove(id);

				if (settings.state["splits.leaveOnClose"]) {
					await channel?.leave();
				}

				return;
			}

			if (channel && settings.state["splits.goToChannelAfterClose"]) {
				await goto(
					resolve("/(main)/channels/[username]", {
						username: channel.user.username,
					}),
				);
			} else {
				await goto(resolve("/"));
			}

			app.splits.root = null;
			return;
		}

		if (preserve) {
			app.splits.replace(id, `split-${crypto.randomUUID()}`);
		} else {
			app.splits.remove(id);
		}

		if (settings.state["splits.leaveOnClose"]) {
			await channel?.leave();
		}
	}
</script>

<div class="bg-sidebar flex items-center justify-between border-b p-1" data-slot="split-header">
	<div
		class="flex h-full flex-1 cursor-grab items-center gap-x-2 overflow-hidden px-1 active:cursor-grabbing"
		{@attach attachHandle}
	>
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
		{/if}
	</div>

	<div class="text-muted-foreground flex shrink-0 items-center gap-x-1">
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
