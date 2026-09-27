<script lang="ts">
	import { createHotkey, createHotkeys } from "@tanstack/svelte-hotkeys";
	import { onMount } from "svelte";

	import { app } from "$lib/app.svelte";
	import JoinDialog from "$lib/components/JoinDialog.svelte";
	import Workspace from "$lib/components/split/Workspace.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import * as Empty from "$lib/components/ui/empty";

	import ChatDots from "~icons/ph/chat-dots";
	import Spinner from "~icons/ph/spinner";

	let loading = $state(true);

	onMount(async () => {
		if (app.user && !app.user.emoteSets.size) {
			await app.user.fetchEmoteSets();
		}

		loading = false;
	});

	createHotkey("Mod+T", () => {
		app.splits.split("right");
	});

	createHotkey("Mod+W", async () => {
		const viewId = app.splits.focusedViewId;

		if (viewId) {
			app.splits.close(viewId);
		} else if (app.focused) {
			await app.focused.leave();
			app.focused = null;
		}
	});

	createHotkeys([
		{ hotkey: "Mod+Tab", callback: () => app.splits.cycle(1) },
		{ hotkey: "Mod+Shift+Tab", callback: () => app.splits.cycle(-1) },
	]);

	createHotkeys([
		{ hotkey: "Mod+ArrowUp", callback: () => app.splits.navigate("up") },
		{ hotkey: "Mod+ArrowDown", callback: () => app.splits.navigate("down") },
		{ hotkey: "Mod+ArrowLeft", callback: () => app.splits.navigate("left") },
		{ hotkey: "Mod+ArrowRight", callback: () => app.splits.navigate("right") },
	]);
</script>

<div class="h-full">
	<Workspace>
		{#snippet empty()}
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
							Select a channel from your following list or search for a channel to
							start chatting.
						</Empty.Description>
					</Empty.Header>

					<Empty.Content>
						<Button command="show-modal" commandfor="join-dialog"
							>Search channels</Button
						>
					</Empty.Content>
				</Empty.Root>

				<JoinDialog />
			{/if}
		{/snippet}
	</Workspace>
</div>
