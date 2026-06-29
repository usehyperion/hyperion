<script lang="ts">
	import { openUrl } from "@tauri-apps/plugin-opener";
	import Button from "$lib/components/ui/Button.svelte";
	import { SCOPES } from "$lib/twitch/auth";
	import { TwitchClient } from "$lib/twitch/client";
	import Twitch from "~icons/local/twitch";

	const params = new URLSearchParams({
		client_id: TwitchClient.CLIENT_ID,
		redirect_uri: TwitchClient.REDIRECT_URL,
		response_type: "code",
		scope: SCOPES.join(" "),
	});

	const authUrl = `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
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
