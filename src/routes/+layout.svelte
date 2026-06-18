<script lang="ts">
	import "../app.css";
	import { invoke } from "@tauri-apps/api/core";
	import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
	import { ModeWatcher } from "mode-watcher";
	import { onDestroy, onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { app } from "$lib/app.svelte";
	import TitleBar from "$lib/components/TitleBar.svelte";
	import { log } from "$lib/log";
	import { CurrentUser } from "$lib/models/current-user.svelte";
	import { settings } from "$lib/settings";
	import { storage } from "$lib/stores";
	import { injectTheme } from "$lib/themes";

	const { children } = $props();

	let unlisten: () => void;

	onMount(async () => {
		injectTheme(settings.state["appearance.theme"]);

		unlisten = await onOpenUrl(async (urls) => {
			const url = new URL(urls[0]);
			log.info("User authenticated");

			if (url.host !== "auth") return;

			const userId = url.searchParams.get("user_id");
			const accessToken = url.searchParams.get("access_token");
			const refreshToken = url.searchParams.get("refresh_token");

			if (!userId || !accessToken || !refreshToken) {
				throw new Error("Missing authentication params");
			}

			const user = await app.twitch.users.fetch(userId);

			storage.state.user = {
				id: userId,
				accessToken,
				refreshToken,
				data: user.data,
			};

			app.user = new CurrentUser(user);

			await storage.saveNow();
			await goto("/");
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
