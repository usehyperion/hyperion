<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import JoinDialog from "$lib/components/JoinDialog.svelte";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Empty from "$lib/components/ui/empty";
	import type { SplitNode } from "$lib/split-layout";
	import { storage } from "$lib/stores";
	import ChatDots from "~icons/ph/chat-dots";
	import Spinner from "~icons/ph/spinner";

	let loading = $state(true);

	function findFirstLeaf(node: SplitNode): string {
		return typeof node === "string" ? node : findFirstLeaf(node.before);
	}

	onMount(async () => {
		await app.connect();

		if (app.user && !app.user.emoteSets.size) {
			await app.user.fetchEmoteSets();
		}

		// Find a channel to navigate to: prefer a leaf in the persisted layout,
		// otherwise fall back to the last joined channel.
		let username: string | null = null;

		if (storage.state.layout) {
			const leafId = findFirstLeaf(storage.state.layout);
			const channel = app.channels.get(leafId);

			if (channel) username = channel.user.username;
		}

		if (!username && storage.state.lastJoined) {
			username = storage.state.lastJoined;
		}

		if (username) {
			await goto(resolve("/(main)/channels/[username]", { username }));
			return;
		}

		loading = false;
	});
</script>

{#if loading}
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
				Select a channel from your following list or search for a channel to start chatting.
			</Empty.Description>
		</Empty.Header>

		<Empty.Content>
			<JoinDialog class={buttonVariants()}>Search channels</JoinDialog>
		</Empty.Content>
	</Empty.Root>
{/if}
