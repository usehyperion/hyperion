<script lang="ts">
	import { onMount } from "svelte";
	import { app } from "$lib/app.svelte";
	import JoinDialog from "$lib/components/JoinDialog.svelte";
	import SplitNode from "$lib/components/split/SplitNode.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Empty from "$lib/components/ui/empty";
	import { settings } from "$lib/settings";
	import { firstLeaf, type SplitDirection } from "$lib/split-layout";
	import { storage } from "$lib/stores";
	import ChatDots from "~icons/ph/chat-dots";
	import Spinner from "~icons/ph/spinner";

	let loading = $state(true);

	onMount(async () => {
		if (app.user && !app.user.emoteSets.size) {
			await app.user.fetchEmoteSets();
		}

		// Restore the focused channel from the first leaf of the persisted layout.
		if (storage.state.layout) {
			const channel = app.channels.get(firstLeaf(storage.state.layout));
			if (channel) await app.open(channel);
		}

		loading = false;
	});

	async function handleKeydown(event: KeyboardEvent) {
		if ((!event.metaKey && !event.ctrlKey) || event.repeat) return;

		switch (event.key) {
			case "t": {
				if (settings.state["advanced.singleConnection"] || !app.splits.focused) return;

				app.splits.insertEmpty(
					app.splits.focused,
					settings.state["splits.defaultOrientation"],
				);

				break;
			}

			case "w": {
				if (
					app.splits.focused &&
					app.splits.root &&
					app.splits.root !== app.splits.focused
				) {
					event.preventDefault();
					app.splits.remove(app.splits.focused);
				} else if (app.focused) {
					event.preventDefault();

					const channel = app.focused;
					await channel.leave();

					app.splits.remove(channel.id);
					app.focused = null;
				}

				break;
			}
		}
	}

	function navigateSplit(event: KeyboardEvent) {
		if (!app.splits.focused || !(event.metaKey || event.ctrlKey)) return;

		let direction: SplitDirection;

		switch (event.key) {
			case "ArrowUp":
				direction = "up";
				break;
			case "ArrowDown":
				direction = "down";
				break;
			case "ArrowLeft":
				direction = "left";
				break;
			case "ArrowRight":
				direction = "right";
				break;
			default:
				return;
		}

		event.preventDefault();

		const targetId = app.splits.navigate(app.splits.focused, direction);
		if (!targetId) return;

		const channel = app.channels.get(targetId);
		if (channel) {
			app.splits.focused = channel.id;
			channel.chat.input?.focus();
		} else {
			app.splits.focused = targetId;
		}
	}
</script>

<svelte:window
	onkeydown={(event) => {
		handleKeydown(event);
		navigateSplit(event);
	}}
/>

<div class="h-full">
	{#if app.splits.root}
		<SplitNode bind:node={app.splits.root} />
	{:else if loading}
		<div class="flex size-full flex-col items-center justify-center">
			<Spinner class="size-6 animate-spin" />
			<span class="mt-2 text-lg font-medium">Loading</span>
		</div>
	{:else}
		<Empty.Root class="h-full">
			<Empty.Header>
				<Empty.Media variant="icon">
					<ChatDots />
				</Empty.Media>

				<Empty.Title>No channel selected</Empty.Title>

				<Empty.Description>
					Select a channel from your following list or search for a channel to start
					chatting.
				</Empty.Description>
			</Empty.Header>

			<Empty.Content>
				<Button command="show-modal" commandfor="join-dialog">Search channels</Button>
			</Empty.Content>
		</Empty.Root>

		<JoinDialog />
	{/if}
</div>
