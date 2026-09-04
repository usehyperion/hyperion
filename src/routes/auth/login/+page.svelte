<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { listen } from "@tauri-apps/api/event";
	import { onMount } from "svelte";

	import Button from "$lib/components/ui/Button.svelte";
	import { log } from "$lib/log";
	import { completeLogin } from "$lib/twitch/auth";

	import Twitch from "~icons/local/twitch";

	let error = $state<string | null>(null);

	onMount(() => {
		const unlisten = listen<string>("twitch-auth-success", async ({ payload }) => {
			try {
				await completeLogin(payload);
			} catch (err) {
				error = "Could not complete sign in. Please try again.";
				log.error(`Failed to complete login: ${err}`);
			}
		});

		return () => void unlisten.then((fn) => fn());
	});

	async function handleLogIn() {
		error = null;
		await invoke("open_twitch_login");
	}
</script>

<img class="size-16" src="/logo.svg" alt="Hyperion logo" />

<div class="space-y-2">
	<h1 class="text-4xl font-semibold">Hyperion</h1>

	<p class="max-w-sm text-muted-foreground">Connect your Twitch account to start chatting.</p>
</div>

<Button class="h-12" size="lg" onclickwait={() => handleLogIn()}>
	<Twitch class="size-5 fill-white" />
	Log in with Twitch
</Button>

{#if error}
	<p class="text-sm text-destructive">{error}</p>
{/if}
