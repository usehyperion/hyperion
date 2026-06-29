<script lang="ts">
	import "../app.css";
	import { invoke } from "@tauri-apps/api/core";
	import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
	import { ModeWatcher } from "mode-watcher";
	import { onDestroy, onMount } from "svelte";
	import TitleBar from "$lib/components/TitleBar.svelte";
	import { log } from "$lib/log";
	import { settings } from "$lib/settings";
	import { injectTheme } from "$lib/themes";
	import { handleDeepLink } from "$lib/twitch/auth";

	const { children } = $props();

	let unlisten: () => void;

	onMount(async () => {
		injectTheme(settings.state["appearance.theme"]);

		unlisten = await onOpenUrl(async (urls) => {
			await handleDeepLink(new URL(urls[0]));
		});
	});

	onDestroy(() => unlisten?.());

	$effect(() => {
		invoke("update_log_level", { level: settings.state["advanced.logs.level"] });
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
	<TitleBar />

	{@render children()}
</div>
