<script lang="ts">
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { ScrollArea } from "bits-ui";
	import { crossfade } from "svelte/transition";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import Chats from "~icons/ph/chats";
	import Plus from "~icons/ph/plus";
	import Sidebar from "~icons/ph/sidebar";
	import ChannelList from "./ChannelList.svelte";
	import JoinDialog from "./JoinDialog.svelte";
	import { Button, buttonVariants } from "./ui/button";

	const sidebar = useSidebar();
	const [send, receive] = crossfade({ duration: 400 });

	const id = $props.id();

	const unread = $derived(app.user?.whispers.values().reduce((sum, w) => sum + w.unread, 0));

	createHotkey("Mod+B", (event) => {
		if (event.shiftKey) {
			sidebar.toggle();
		} else {
			sidebar.cycle();
		}
	});
</script>

<ScrollArea.Root
	class={[
		"group shrink-0 overflow-hidden transition-[width] duration-300 ease-out-quint",
		sidebar.state === "hidden" && "w-0",
		sidebar.state === "collapsed" && "w-14",
		sidebar.state === "expanded" && "w-56 md:w-64 lg:w-72",
	]}
	data-state={sidebar.state}
>
	<ScrollArea.Viewport class="h-full">
		<div id="sidebar-actions" class="flex flex-col gap-1 px-1.5 py-1">
			<Button class="relative" href={resolve("/whispers")} variant="ghost">
				<Chats class={[sidebar.collapsed && unread && "animate-pulse"]} />

				<span class="not-group-data-[state=expanded]:sr-only">Whispers</span>

				{#if sidebar.collapsed && unread}
					<div
						in:receive={{ key: id }}
						out:send={{ key: id }}
						class="absolute top-2 right-2 size-2 rounded-full bg-red-500"
					></div>
				{:else if unread}
					<div
						in:receive={{ key: id }}
						out:send={{ key: id }}
						class="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.625rem] font-medium text-foreground"
					>
						{unread}
					</div>
				{/if}
			</Button>

			<JoinDialog class={buttonVariants({ variant: "ghost" })}>
				<Plus />

				<span class="not-group-data-[state=expanded]:sr-only">Join a channel</span>
			</JoinDialog>

			<Button variant="ghost" onclick={() => sidebar.cycle()}>
				<Sidebar />

				<span class="not-group-data-[state=expanded]:sr-only"> Toggle sidebar </span>
			</Button>
		</div>

		<nav class="space-y-1.5 pb-3">
			<ChannelList />
		</nav>
	</ScrollArea.Viewport>

	<ScrollArea.Scrollbar
		class={[
			"w-2 p-0.5 opacity-50",
			"data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=visible]:fade-in-0",
			"group-data-[state=collapsed]:hidden",
		]}
		orientation="vertical"
	>
		<ScrollArea.Thumb class="rounded-full bg-muted-foreground/80" />
	</ScrollArea.Scrollbar>
</ScrollArea.Root>

<style>
	@reference "../../app.css";

	#sidebar-actions > :global(*) {
		color: var(--color-muted-foreground);
		height: --spacing(11);
		justify-content: flex-start;
		padding-inline: --spacing(3.5);

		@variant hover {
			color: var(--color-foreground);
		}
	}
</style>
