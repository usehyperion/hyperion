<script lang="ts">
	import "../styles/app.css";
	import { setHotkeysContext } from "@tanstack/svelte-hotkeys";
	import { invoke } from "@tauri-apps/api/core";
	import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
	import { Tooltip } from "bits-ui";
	import { ModeWatcher } from "mode-watcher";
	import { onDestroy, onMount } from "svelte";

	import { page } from "$app/state";
	import { app } from "$lib/app.svelte";
	import TitleBar from "$lib/components/TitleBar.svelte";
	import { log } from "$lib/log";
	import { settings } from "$lib/settings";
	import { injectTheme } from "$lib/themes";
	import { handleDeepLink } from "$lib/twitch/auth";

	const { children } = $props();

	// Popouts are standalone windows and supply their own chrome, so the app
	// title bar (search, history, whispers, settings) is skipped for them.
	const popout = $derived(page.route.id?.startsWith("/(popout)") ?? false);

	let unlisten: () => void;

	onMount(async () => {
		// The split layout and deep links are owned by the main window. Running
		// either from a popout would clobber shared layout state or handle the
		// same deep link once per open window.
		if (popout) return;

		app.splits.cleanup();

		unlisten = await onOpenUrl(async (urls) => {
			await handleDeepLink(new URL(urls[0]));
		});
	});

	onDestroy(() => unlisten?.());

	setHotkeysContext({
		hotkey: {
			requireReset: true,
		},
	});

	$effect(() => {
		invoke("update_log_level", { level: settings.state["advanced.logs.level"] });
	});

	$effect(() => {
		injectTheme(settings.state["appearance.theme"]);
	});

	addEventListener("error", (event) => {
		if (event.message.startsWith("ResizeObserver loop")) {
			event.preventDefault();
			return;
		}

		log.error(`[${event.filename}@${event.lineno}:${event.colno}] ${event.message}`);
	});

	addEventListener("unhandledrejection", (event) => {
		log.error(`Unhandled promise rejection: ${event.reason}`);

		if (event.reason instanceof AggregateError) {
			for (const error of event.reason.errors) {
				log.error(`\t- ${error.message}`);
			}
		}
	});
</script>

<ModeWatcher />

<div class="flex h-screen flex-col overflow-hidden">
	{#if !popout}
		<TitleBar />
	{/if}

	<Tooltip.Provider delayDuration={300}>
		{@render children()}
	</Tooltip.Provider>
</div>
