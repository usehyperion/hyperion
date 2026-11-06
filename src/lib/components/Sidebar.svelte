<script lang="ts">
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import { ScrollArea } from "bits-ui";

	import { storage } from "#lib/stores.js";

	import ChannelList from "./channel/ChannelList.svelte";
	createHotkey("Mod+B", () => {
		storage.state.sidebarCollapsed = !storage.state.sidebarCollapsed;
	});
</script>

<ScrollArea.Root
	class={[
		"group shrink-0 overflow-hidden transition-[width] duration-200 ease-out-quint",
		storage.state.sidebarCollapsed ? "w-0" : "w-12",
	]}
	data-collapsed={storage.state.sidebarCollapsed}
>
	<ScrollArea.Viewport class="h-full">
		<nav>
			<ChannelList />
		</nav>
	</ScrollArea.Viewport>

	<ScrollArea.Scrollbar
		class={[
			"w-2 p-0.5 opacity-50",
			"data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:animate-in data-[state=visible]:fade-in-0",
			"group-data-[collapsed=true]:hidden",
		]}
		orientation="vertical"
	>
		<ScrollArea.Thumb class="rounded-full bg-muted-foreground/80" />
	</ScrollArea.Scrollbar>
</ScrollArea.Root>
