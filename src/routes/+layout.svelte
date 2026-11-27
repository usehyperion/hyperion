<script lang="ts">
	import "../styles/app.css";
	import { HotkeysProvider } from "@tanstack/svelte-hotkeys";
	import { invoke } from "@tauri-apps/api/core";
	import { ModeWatcher } from "mode-watcher";
	import { onMount } from "svelte";

	import EmoteTooltip, { provideEmoteTooltip } from "#lib/components/emote/EmoteTooltip.svelte";
	import TitleBar from "#lib/components/TitleBar.svelte";
	import HintTooltip, { provideHintTooltip } from "#lib/components/ui/HintTooltip.svelte";
	import { log } from "#lib/log.js";
	import { settings } from "#lib/settings.js";
	import { injectTheme } from "#lib/themes.js";

	const { children } = $props();

	const emoteTooltip = provideEmoteTooltip();
	const hintTooltip = provideHintTooltip();

	onMount(() => {
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

		addEventListener("error", onError);
		addEventListener("unhandledrejection", onRejection);

		return () => {
			removeEventListener("error", onError);
			removeEventListener("unhandledrejection", onRejection);
		};
	});

	$effect(() => {
		invoke("update_log_level", { level: settings.state["advanced.logs.level"] });
	});

	$effect(() => {
		injectTheme(settings.state["appearance.theme"]);
	});

	function onError(event: ErrorEvent) {
		if (event.message.startsWith("ResizeObserver loop")) {
			event.preventDefault();
			return;
		}

		log.error(`[${event.filename}@${event.lineno}:${event.colno}] ${event.message}`);
	}

	function onRejection(event: PromiseRejectionEvent) {
		log.error(`Unhandled promise rejection: ${event.reason}`);

		if (event.reason instanceof AggregateError) {
			for (const error of event.reason.errors) {
				log.error(`\t- ${error.message}`);
			}
		}
	}
</script>

<ModeWatcher />

<div class="app-window flex h-screen flex-col overflow-hidden">
	<TitleBar />

	<HotkeysProvider
		defaultOptions={{
			hotkey: {
				requireReset: true,
			},
		}}
	>
		{@render children()}
	</HotkeysProvider>
</div>

<EmoteTooltip controller={emoteTooltip} />
<HintTooltip controller={hintTooltip} />
