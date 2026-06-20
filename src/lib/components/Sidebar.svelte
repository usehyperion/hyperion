<script lang="ts">
	import { createHotkeys } from "@tanstack/svelte-hotkeys";
	import { ScrollArea } from "bits-ui";
	import { useSidebar } from "$lib/hooks/use-sidebar.svelte";
	import Plus from "~icons/ph/plus";
	import SidebarIcon from "~icons/ph/sidebar";
	import ChannelList from "./ChannelList.svelte";
	import JoinDialog from "./JoinDialog.svelte";
	import { Button, buttonVariants } from "./ui/button";

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
		<div id="sidebar-actions" class="flex flex-col gap-1 px-1.5 py-1">
			<Button command="show-modal" commandfor="join-dialog" variant="ghost">
				<Plus />

				<span class="not-group-data-[state=expanded]:sr-only">Join a channel</span>
			</Button>

			<Button variant="ghost" onclick={() => sidebar.cycle()}>
				<SidebarIcon />

				<span class="not-group-data-[state=expanded]:sr-only"> Toggle sidebar </span>
			</Button>

			<JoinDialog />
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
	@reference "../../styles/app.css";

	#sidebar-actions > :global(:is(button, a)) {
		color: var(--color-muted-foreground);
		height: --spacing(11);
		justify-content: flex-start;
		padding-inline: --spacing(3.5);

		@variant hover {
			color: var(--color-foreground);
		}
	}
</style>
