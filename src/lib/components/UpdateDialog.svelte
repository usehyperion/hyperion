<script lang="ts">
	import { settings } from "#lib/settings/index.js";
	import { UPDATE_DIALOG_ID, updater } from "#lib/updater.svelte.js";

	import Button from "./ui/Button.svelte";
	import Checkbox from "./ui/Checkbox.svelte";
	import Dialog from "./ui/Dialog.svelte";
	import * as Field from "./ui/field/index.js";
	import Progress from "./ui/Progress.svelte";

	const id = $props.id();

	const version = $derived(updater.update?.version);
	const currentVersion = $derived(updater.update?.currentVersion);

	const progress = $derived(
		updater.total ? Math.min(100, (updater.downloaded / updater.total) * 100) : null,
	);

	function formatSize(bytes: number) {
		return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
	}
</script>

<Dialog id={UPDATE_DIALOG_ID} aria-labelledby="t-{id}">
	{#snippet header()}
		{#if updater.status === "available"}
			<h2 id="t-{id}">Update available</h2>

			<p>
				Hyperion v{version} is ready to download. You're on v{currentVersion}.
			</p>
		{:else if updater.status === "downloading"}
			<h2 id="t-{id}">Downloading update</h2>
			<p>You can keep using Hyperion while v{version} downloads.</p>
		{:else if updater.status === "ready"}
			<h2 id="t-{id}">Restart to update</h2>

			<p>
				Hyperion v{version} is ready. Restart now to finish updating, or it will be installed
				{updater.deferred ? "when you quit Hyperion" : "the next time Hyperion opens"}.
			</p>
		{:else if updater.status === "error"}
			<h2 id="t-{id}">Update failed</h2>
			<p>Hyperion v{version} couldn't be installed.</p>
		{/if}
	{/snippet}

	{#if updater.status === "available"}
		<Field.Field orientation="horizontal">
			<Checkbox id="a-{id}" bind:checked={settings.state["advanced.updates.autoInstall"]} />

			<Field.Label class="font-normal" for="a-{id}">
				Automatically download and install updates
			</Field.Label>
		</Field.Field>
	{:else if updater.status === "downloading"}
		<div class="space-y-2">
			<Progress value={progress} />

			<p class="text-sm text-muted-foreground tabular-nums">
				{#if updater.total}
					{formatSize(updater.downloaded)} of {formatSize(updater.total)}
				{:else}
					{formatSize(updater.downloaded)}
				{/if}
			</p>
		</div>
	{:else if updater.status === "error" && updater.error}
		<p class="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{updater.error}</p>
	{/if}

	{#snippet footer()}
		{#if updater.status === "available"}
			<Button variant="secondary" command="close" commandfor={UPDATE_DIALOG_ID}>Later</Button>
			<Button onclick={() => updater.download()}>Update</Button>
		{:else if updater.status === "downloading"}
			<Button variant="secondary" command="close" commandfor={UPDATE_DIALOG_ID}>Hide</Button>
		{:else if updater.status === "ready"}
			<Button variant="secondary" command="close" commandfor={UPDATE_DIALOG_ID}>Later</Button>
			<Button onclickwait={() => updater.restart()}>Restart now</Button>
		{:else if updater.status === "error"}
			<Button variant="secondary" command="close" commandfor={UPDATE_DIALOG_ID}>Close</Button>
			<Button onclick={() => updater.download()}>Try again</Button>
		{/if}
	{/snippet}
</Dialog>
