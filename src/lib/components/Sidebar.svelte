<script lang="ts">
	import { createHotkeys } from "@tanstack/svelte-hotkeys";
	import { ScrollArea } from "bits-ui";

	import { useSidebar } from "#lib/hooks/use-sidebar.svelte.js";

	import ChannelList from "./channel/ChannelList.svelte";
	const sidebar = useSidebar();

	createHotkeys([{ hotkey: "Mod+B", callback: () => sidebar.toggle() }]);
</script>

<ScrollArea.Root
	class={[
		"group shrink-0 overflow-hidden transition-[width] duration-200 ease-out-quint",
		sidebar.collapsed ? "w-0" : "w-12",
	]}
	data-component="sidebar"
	data-collapsed={sidebar.collapsed}
>
	<ScrollArea.Viewport class="h-full">
		<nav data-slot="sidebar-nav">
			<ChannelList />
		</nav>
	</ScrollArea.Viewport>

	<ScrollArea.Scrollbar
		class={[
			"w-2 p-0.5 opacity-50",
			"data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=visible]:fade-in-0",
			"group-data-[collapsed=true]:hidden",
		]}
		data-slot="sidebar-scrollbar"
		orientation="vertical"
	>
		<ScrollArea.Thumb
			class="rounded-full bg-muted-foreground/80"
			data-slot="sidebar-scrollbar-thumb"
		/>
	</ScrollArea.Scrollbar>
</ScrollArea.Root>
