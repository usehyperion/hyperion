<script lang="ts">
	import { ScrollArea } from "bits-ui";
	import { MediaQuery } from "svelte/reactivity";
	import { app } from "$lib/app.svelte";
	import ChannelList from "./ChannelList.svelte";

	app.sidebarCollapsed = new MediaQuery("(width < 48rem)").current;
</script>

<svelte:document
	onkeydown={(event) => {
		if (event.repeat) return;

		if ((event.metaKey || event.ctrlKey) && event.key === "b") {
			app.sidebarCollapsed = !app.sidebarCollapsed;
		}
	}}
/>

<ScrollArea.Root
	class={[
		"group shrink-0 transition-[width] duration-300 ease-out-quint",
		app.sidebarCollapsed ? "w-14" : "w-56 md:w-64 lg:w-72",
	]}
	data-state={app.sidebarCollapsed ? "collapsed" : "expanded"}
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
