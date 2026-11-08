<script lang="ts">
	import { AutoScroller } from "@dnd-kit/dom";
	import { DragDropProvider, DragOverlay } from "@dnd-kit/svelte";
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { onMount, untrack } from "svelte";

	import { app } from "#lib/app.svelte.js";
	import ChannelIcon from "#lib/components/channel/ChannelIcon.svelte";
	import Sidebar from "#lib/components/Sidebar.svelte";
	import Avatar from "#lib/components/ui/Avatar.svelte";
	import { dialogs, openDialog } from "#lib/dialog.js";
	import { THIRD_PARTY_PROVIDERS } from "#lib/emotes.js";
	import { log } from "#lib/log.js";
	import { settings } from "#lib/settings/index.js";
	import { onDragStart, onDragOver, onDragMove, onDragEnd } from "#lib/splits/events.js";
	import { updater } from "#lib/updater.svelte.js";

	const { children } = $props();

	const STREAM_REFRESH_INTERVAL = 5 * 60 * 1000;

	onMount(() => {
		void app.connect();
		void updater.check();

		const id = setInterval(() => {
			app.channels.refreshStreams().catch(log.swallow("Failed to refresh streams"));
		}, STREAM_REFRESH_INTERVAL);

		return () => clearInterval(id);
	});

	$effect(() => {
		for (const { emotesSetting } of THIRD_PARTY_PROVIDERS) {
			void settings.state[emotesSetting];
		}

		untrack(() => {
			void app.emotes.fetch();

			for (const channel of app.channels.values()) {
				if (channel.joined) void channel.emotes.fetch();
			}
		});
	});

	createHotkey("Mod+,", () => openDialog(dialogs.settings));
</script>

<DragDropProvider
	plugins={(defaults) => [
		...defaults,
		AutoScroller.configure({
			threshold: { x: 0, y: 0 },
		}),
	]}
	{onDragStart}
	{onDragOver}
	{onDragMove}
	{onDragEnd}
>
	<div class="flex grow overflow-hidden">
		{#if app.user}
			<Sidebar />
		{/if}

		<main class={["grow overflow-hidden bg-accent/15", app.user && "border-l"]}>
			{@render children()}
		</main>
	</div>

	<DragOverlay>
		{#snippet children(source)}
			{@const channel = app.channels.get(source.data.id)}
			{@const isTab = source.type === "tab"}

			{#if channel}
				{#if isTab}
					<div
						class="mx-auto flex max-w-max items-center gap-2 rounded bg-background px-2 py-1"
					>
						<Avatar
							class={["size-6", !channel.stream && "grayscale"]}
							src={channel.user.avatarUrl}
							alt={channel.user.displayName}
							width="150"
							height="150"
						/>

						<span class="text-sm font-medium">{channel.user.displayName}</span>
					</div>
				{:else}
					<div class="flex items-center gap-2">
						<ChannelIcon {channel} />
					</div>
				{/if}
			{/if}
		{/snippet}
	</DragOverlay>
</DragDropProvider>
