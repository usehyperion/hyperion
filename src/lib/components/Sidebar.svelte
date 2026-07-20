<script lang="ts">
	import { createHotkeys } from "@tanstack/svelte-hotkeys";
	import { ScrollArea } from "bits-ui";
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import ChannelList from "./channel/ChannelList.svelte";
	const sidebar = useSidebar();

	createHotkeys([
		{ hotkey: "Mod+B", callback: () => sidebar.cycle() },
		{ hotkey: "Mod+Shift+B", callback: () => sidebar.toggle() },
	]);
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
		<nav class="mt-1.5 space-y-1.5 pb-3">
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
