<script lang="ts">
	import { appLogDir } from "@tauri-apps/api/path";
	import { openPath } from "@tauri-apps/plugin-opener";
	import { DialogTrigger } from "@ui-sdk/svelte/dialog";

	import { app } from "#lib/app.svelte.js";
	import Button from "#lib/components/ui/Button.svelte";
	import { closeDialog, dialogController, dialogs } from "#lib/dialog.js";
	import { IconAbout, IconLogOut, IconOpenFolder } from "#lib/icons.js";

	import AboutDialog from "./AboutDialog.svelte";

	async function openLogDir() {
		await openPath(await appLogDir());
	}
</script>

<div class="space-y-0.5 *:w-full *:justify-start">
	<Button class="text-fg-muted" variant="ghost" onclick={openLogDir}>
		<IconOpenFolder />
		<span class="text-body">Open logs</span>
	</Button>

	<DialogTrigger controller={dialogController(dialogs.about)}>
		{#snippet render({ props })}
			<Button {...props} class="text-fg-muted" variant="ghost">
				<IconAbout />
				<span class="text-body">About</span>
			</Button>
		{/snippet}
	</DialogTrigger>

	{#if app.user}
		<Button
			class="text-fg-muted"
			variant="ghost"
			onclick={async () => {
				closeDialog(dialogs.settings);
				await app.logOut();
			}}
		>
			<IconLogOut />
			<span class="text-body">Log out</span>
		</Button>
	{/if}
</div>

<AboutDialog />
