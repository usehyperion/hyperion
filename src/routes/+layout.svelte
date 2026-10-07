<script lang="ts">
	import "../styles/app.css";
	import { setHotkeysContext } from "@tanstack/svelte-hotkeys";
	import { invoke } from "@tauri-apps/api/core";
	import { ModeWatcher } from "mode-watcher";
	import { onMount } from "svelte";

	import { app } from "#lib/app.svelte.js";
	import TitleBar from "#lib/components/TitleBar.svelte";
	import { log } from "#lib/log.js";
	import { settings } from "#lib/settings/index.js";
	import { injectTheme } from "#lib/themes.js";

	const { children } = $props();

	onMount(() => {
		app.splits.cleanup();

		// The root load has resolved by the time this mounts, so the splash can
		// be removed
		const splash = document.getElementById("splash");

		void splash
			?.animate([{ opacity: 1 }, { opacity: 0 }], {
				duration: 250,
				easing: "ease-out",
				fill: "forwards",
			})
			.finished.then(() => splash.remove());
	});

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

<div class="flex h-screen flex-col overflow-hidden" data-component="root-layout">
	<TitleBar />

	{@render children()}
</div>
