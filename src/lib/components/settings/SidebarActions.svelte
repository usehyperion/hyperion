<script lang="ts">
	import { appLogDir } from "@tauri-apps/api/path";
	import { openPath } from "@tauri-apps/plugin-opener";

	import FolderOpen from "~icons/ph/folder-open";
	import Info from "~icons/ph/info";
	import SignOut from "~icons/ph/sign-out";

	import { app } from "#lib/app.svelte.js";
	import Button from "#lib/components/ui/Button.svelte";
	import { logOut } from "#lib/twitch/auth.js";

	import { closeDialog } from "../ui/Dialog.svelte";
	import AboutDialog from "./AboutDialog.svelte";

	async function openLogDir() {
		await openPath(await appLogDir());
	}
</script>

<div class="space-y-0.5 *:w-full *:justify-start">
	<Button class="text-muted-foreground" variant="ghost" onclick={openLogDir}>
		<FolderOpen />
		<span class="text-sm">Open logs</span>
	</Button>

	<Button
		class="text-muted-foreground"
		command="show-modal"
		commandfor="about-dialog"
		variant="ghost"
	>
		<Info />
		<span class="text-sm">About</span>
	</Button>

	{#if app.user}
		<Button
			class="text-muted-foreground"
			variant="ghost"
			onclick={() => {
				logOut();
				closeDialog("settings-dialog");
			}}
		>
			<SignOut />
			<span class="text-sm">Log out</span>
		</Button>
	{/if}
</div>

<AboutDialog />
