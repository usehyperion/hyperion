<script lang="ts">
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { getCurrentWindow } from "@tauri-apps/api/window";
	import { platform as getPlatform } from "@tauri-apps/plugin-os";
	import { onDestroy, onMount } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { afterNavigate } from "$app/navigation";
	import { resolve } from "$app/paths";

	import ArrowLeft from "~icons/ph/arrow-left";
	import ArrowRight from "~icons/ph/arrow-right";
	import Chats from "~icons/ph/chats";
	import Gear from "~icons/ph/gear";
	import MagnifyingGlass from "~icons/ph/magnifying-glass";

	import { app } from "#lib/app.svelte.js";

	import JoinDialog from "./JoinDialog.svelte";
	import SettingsDialog from "./settings/SettingsDialog.svelte";
	import Button from "./ui/Button.svelte";
	import Link from "./ui/Link.svelte";

	type ControlType = "minimize" | "maximize" | "close";

	const currentWindow = getCurrentWindow();
	const platform = getPlatform();

	let unlisten: UnlistenFn | undefined;

	let maximized = $state(false);
	let fullscreen = $state(false);

	const hasUnread = $derived(
		app.user ? app.user.whispers.values().some((whisper) => whisper.unread > 0) : false,
	);

	onMount(async () => {
		if (!currentWindow) return;

		fullscreen = await currentWindow.isFullscreen();

		unlisten = await currentWindow.onResized(async () => {
			maximized = await currentWindow.isMaximized();
			fullscreen = await currentWindow.isFullscreen();
		});
	});

	onDestroy(() => unlisten?.());

	afterNavigate((navigation) => {
		if (navigation.shallow) return;

		if (!navigation.to || navigation.to.route.id?.startsWith("/auth")) {
			return;
		}

		if (navigation.type === "link" || navigation.type === "goto") {
			const path = navigation.to.url.pathname;

			if (path !== "/") {
				app.history.pushRoute(path);
			}
		}
	});
</script>

<div
	class="relative flex min-h-title-bar w-full shrink-0 items-center justify-between border-b"
	data-component="title-bar"
	data-tauri-drag-region
>
	<div
		class={[
			"flex items-center text-muted-foreground",
			platform === "macos" && (fullscreen ? "pl-3" : "pl-20"),
			["windows", "linux"].includes(platform) && "pl-3",
		]}
		data-slot="title-bar-start"
		data-tauri-drag-region
	>
		<img class="size-4" data-slot="title-bar-logo" src="/logo.svg" alt="Hyperion logo" />
	</div>

	{#if app.user}
		<div
			class="flex items-center justify-center gap-1.5"
			data-slot="title-bar-nav"
			data-tauri-drag-region
		>
			<Button
				class="size-min p-1 hover:text-foreground"
				size="icon"
				variant="ghost"
				disabled={!app.history.canGoBack}
				onclick={() => app.history.back()}
			>
				<ArrowLeft />
			</Button>

			<Button
				class="size-min p-1 hover:text-foreground"
				size="icon"
				variant="ghost"
				disabled={!app.history.canGoForward}
				onclick={() => app.history.forward()}
			>
				<ArrowRight />
			</Button>

			<button
				class="flex w-64 items-center justify-center gap-2 rounded-md bg-popover px-2 py-1 text-xs text-muted-foreground ring-1 ring-border transition-[background-color,scale] hover:bg-accent active:scale-[0.96]"
				data-slot="title-bar-search"
				command="show-modal"
				commandfor="join-dialog"
			>
				<MagnifyingGlass /> Search channels
			</button>

			<JoinDialog />

			<Link
				class="relative size-min p-1 text-muted-foreground"
				href={resolve("whispers")}
				size="icon"
				variant="ghost"
				aria-label={hasUnread ? "Go to whispers (unread)" : "Go to whispers"}
			>
				<Chats />

				{#if hasUnread}
					<span
						class="pointer-events-none absolute top-0.5 right-0.5 flex size-1.5"
						data-slot="title-bar-unread-indicator"
					>
						<span
							class="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75 motion-reduce:hidden"
						></span>
						<span class="relative inline-flex size-1.5 rounded-full bg-red-500"></span>
					</span>
				{/if}
			</Link>
		</div>
	{/if}

	<div class="flex items-center justify-end" data-slot="title-bar-end" data-tauri-drag-region>
		<div class="pr-3">
			<Button
				class="size-min p-1 text-muted-foreground"
				command="show-modal"
				commandfor="settings-dialog"
				size="icon"
				variant="ghost"
				aria-label="Open settings"
			>
				<Gear />
			</Button>
		</div>

		{#if platform === "windows"}
			<div class="flex" data-slot="title-bar-controls">
				{@render control("minimize", {
					onclick: () => currentWindow?.minimize(),
				})}

				{@render control("maximize", {
					onclick: () => currentWindow?.toggleMaximize(),
				})}

				{@render control("close", {
					onclick: () => currentWindow?.close(),
				})}
			</div>
		{/if}
	</div>
</div>

<SettingsDialog />

{#snippet control(type: ControlType, rest: HTMLButtonAttributes)}
	<button
		class="flex h-title-bar w-12 items-center justify-center bg-transparent text-[10px] font-light transition-colors hover:bg-white/10 hover:data-[control=close]:bg-[#ff0000]/70"
		data-slot="title-bar-control"
		data-control={type}
		{...rest}
	>
		{#if type === "minimize"}
			{"\uE921"}
		{:else if type === "maximize"}
			{maximized ? "\uE923" : "\uE922"}
		{:else}
			{"\uE8BB"}
		{/if}
	</button>
{/snippet}

<style>
	[data-control] {
		text-rendering: optimizeLegibility;
		font-family: "Segoe Fluent Icons", "Segoe MDL2 Assets";
	}
</style>
