<script lang="ts">
	import { createHotkey } from "@tanstack/svelte-hotkeys";
	import {
		ScrollArea,
		ScrollAreaContent,
		ScrollAreaScrollbar,
		ScrollAreaThumb,
		ScrollAreaViewport,
	} from "@ui-sdk/svelte/scroll-area";

	import { useSidebar } from "#lib/hooks/use-sidebar.svelte.js";

	import ChannelList from "./channel/ChannelList.svelte";

	const sidebar = useSidebar();

	createHotkey("Mod+B", () => sidebar.toggle());
</script>

<ScrollArea
	class={[
		"sidebar group shrink-0 overflow-hidden transition-[width] duration-200 ease-out-quint",
		sidebar.collapsed ? "w-0" : "w-12",
	]}
	data-collapsed={sidebar.collapsed}
>
	<ScrollAreaViewport class="size-full">
		<ScrollAreaContent>
			<nav aria-label="Channels">
				<ChannelList />
			</nav>
		</ScrollAreaContent>
	</ScrollAreaViewport>

	<ScrollAreaScrollbar
		class="w-2 p-0.5 opacity-0 transition-opacity duration-150 group-data-[collapsed=true]:hidden data-visible:opacity-50"
		orientation="vertical"
	>
		<ScrollAreaThumb class="w-full rounded-full bg-fg-muted" />
	</ScrollAreaScrollbar>
</ScrollArea>
