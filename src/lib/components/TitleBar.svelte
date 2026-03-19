<script lang="ts">
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
	import { platform as getPlatform } from "@tauri-apps/plugin-os";
	import { onDestroy, onMount } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import Logo from "~icons/local/logo";
	import ArrowLeft from "~icons/ph/arrow-left";
	import ArrowRight from "~icons/ph/arrow-right";
	import Gear from "~icons/ph/gear";
	import User from "~icons/ph/user";
	import { afterNavigate, goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { app } from "$lib/app.svelte";
	import GuestList from "./GuestList.svelte";
	import { Button } from "./ui/button";

	type ControlType = "minimize" | "maximize" | "close";

	const currentWindow = getCurrentWindow();
	const platform = getPlatform();

	let unlisten: UnlistenFn | undefined;

	let maximized = $state(false);
	let fullscreen = $state(false);

	const { icon, title, guests } = $derived(
		page.data.titleBar ?? { icon: Logo, title: "Hyperion" },
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
		if (!navigation.to || navigation.to.route.id?.startsWith("/auth")) {
			return;
		}

		if (navigation.type === "link" || navigation.type === "goto") {
			app.history.push(navigation.to.url.pathname);
		}
	});

	async function openSettings() {
		const windows = await getAllWindows();
		const settingsWindow = windows.find((win) => win.label === "settings");

		if (settingsWindow) {
			await settingsWindow.setFocus();
		} else {
			await goto(resolve("/settings"));
		}
	}
</script>

<div
	class="min-h-title-bar relative flex w-full shrink-0 items-center justify-between border-b"
	data-tauri-drag-region
>
	<div
		class={[
			"text-muted-foreground flex items-center gap-0.5",
			platform === "macos" && (fullscreen ? "pl-3" : "pl-18"),
			["windows", "linux"].includes(platform) && "pl-3",
		]}
		data-tauri-drag-region
	>
		<Button
			class="hover:text-foreground size-min p-1"
			size="icon"
			variant="ghost"
			disabled={!app.history.canGoBack}
			onclick={() => app.history.back()}
		>
			<ArrowLeft />
		</Button>

		<Button
			class="hover:text-foreground size-min p-1"
			size="icon"
			variant="ghost"
			disabled={!app.history.canGoForward}
			onclick={() => app.history.forward()}
		>
			<ArrowRight />
		</Button>
	</div>

	<div
		class="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1.5"
		data-tauri-drag-region
	>
		{#if typeof icon === "string"}
			<img class="size-5 rounded-full" src={icon} alt={title} data-tauri-drag-region />
		{:else}
			{@const Icon = icon}
			<Icon class="size-4" data-tauri-drag-region />
		{/if}

		<span class="pointer-events-none text-sm font-medium">
			{title}
		</span>

		{#if app.focused?.stream && guests}
			<GuestList channel={app.focused} />
		{/if}
	</div>

	<div class="flex items-center justify-end" data-tauri-drag-region>
		<div class="text-muted-foreground flex items-center gap-0.5 pr-3">
			{#if app.user}
				<Button
					class="hover:text-foreground size-min p-1"
					href={resolve("/(main)/channels/[username]", {
						username: app.user.username,
					})}
					size="icon"
					variant="ghost"
					aria-label="Go to your channel"
					data-sveltekit-preload-data="off"
				>
					<User />
				</Button>
			{/if}

			<Button
				class="hover:text-foreground size-min p-1"
				size="icon"
				variant="ghost"
				aria-label="Go to settings"
				onclick={openSettings}
			>
				<Gear />
			</Button>
		</div>

		{#if platform === "windows"}
			<div class="flex">
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

{#snippet control(type: ControlType, rest: HTMLButtonAttributes)}
	<button
		class="h-title-bar flex w-12 items-center justify-center bg-transparent text-[10px] font-light transition-colors hover:bg-white/10 hover:data-[control=close]:bg-[#ff0000]/70"
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
