<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { listen } from "@tauri-apps/api/event";
	import type { UnlistenFn } from "@tauri-apps/api/event";
	import { openUrl } from "@tauri-apps/plugin-opener";
	import { onDestroy, onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { app } from "$lib/app.svelte";
	import { Button } from "$lib/components/ui/button";
	import { log } from "$lib/log";
	import { CurrentUser } from "$lib/models/current-user.svelte";
	import { storage } from "$lib/stores";
	import { SCOPES } from "$lib/twitch";
	import { TwitchClient } from "$lib/twitch/client";
	import Twitch from "~icons/local/twitch";

	interface TokenInfo {
		user_id: string;
		access_token: string;
	}

	const params = {
		client_id: TwitchClient.CLIENT_ID,
		redirect_uri: TwitchClient.REDIRECT_URL,
		response_type: "token",
		scope: SCOPES.join(" "),
	};

	const authUrl = new URL("https://id.twitch.tv/oauth2/authorize");

	for (const [key, value] of Object.entries(params)) {
		authUrl.searchParams.set(key, value);
	}

	let unlisten: UnlistenFn | undefined;

	onMount(async () => {
		log.info("Authenticating user");
		await invoke("start_server");

		unlisten = await listen<TokenInfo>("tokeninfo", async (event) => {
			log.info("User authenticated");

			const user = await app.twitch.users.fetch(event.payload.user_id);

			storage.state.user = {
				id: event.payload.user_id,
				token: event.payload.access_token,
				data: user.data,
			};

			app.user = new CurrentUser(user);

			await storage.saveNow();
			await goto(resolve("/"));
		});
	});

	onDestroy(() => unlisten?.());
</script>

<img class="size-16" src="/logo.svg" alt="Hyperion logo" />

<div class="space-y-2">
	<h1 class="text-4xl font-semibold">Hyperion</h1>

	<p class="max-w-sm text-muted-foreground">Connect your Twitch account to start chatting.</p>
</div>

<Button
	class="h-12 bg-twitch text-base text-primary hover:bg-twitch-600"
	size="lg"
	onclickwait={() => openUrl(authUrl.toString())}
>
	<Twitch class="size-5 fill-white" />
	Log in with Twitch
</Button>
