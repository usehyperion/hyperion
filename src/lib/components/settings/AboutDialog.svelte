<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { scale } from "svelte/transition";

	import Check from "~icons/ph/check";
	import Clipboard from "~icons/ph/clipboard";

	import Button from "#lib/components/ui/Button.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import { dialogs } from "#lib/dialog.js";
	import { log } from "#lib/log.js";

	interface AboutInfo {
		name: string;
		version: string;
		commit: string | null;
		tauriVersion: string;
		os: string;
		webview: string;
	}

	let info = $state<AboutInfo | null>(null);
	let failed = $state(false);
	let copied = $state(false);

	const details = $derived(
		info
			? [
					...(info.commit ? [{ label: "Commit", value: info.commit }] : []),
					{ label: "Tauri", value: info.tauriVersion },
					{ label: "WebView", value: info.webview },
					{ label: "OS", value: info.os },
				]
			: [],
	);

	const rows = $derived(info ? [{ label: "Version", value: info.version }, ...details] : []);

	async function ontoggle(event: ToggleEvent) {
		if (event.newState !== "open") return;

		try {
			info = await invoke<AboutInfo>("get_about_info");
			failed = false;
		} catch (error) {
			failed = true;
			log.error("Failed to load about info", error);
		}
	}

	async function copyInfo() {
		if (!info) return;

		const text = [
			`${info.name} v${info.version}`,
			...details.map((row) => `${row.label}: ${row.value}`),
		].join("\n");

		await navigator.clipboard.writeText(text);
		copied = true;

		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<Dialog id="about-dialog" aria-label="About" {ontoggle}>
	{#snippet header()}
		<div class="flex flex-col items-center gap-3 text-center">
			<img class="size-16" src="/logo.svg" alt="Hyperion logo" />

			<div>
				<h2 class="text-lg/tight font-semibold">Hyperion</h2>

				<p class="text-sm text-muted-foreground tabular-nums">
					{info ? `v${info.version}` : " "}
				</p>
			</div>
		</div>
	{/snippet}

	{#if failed && !info}
		<p class="px-3 py-2 text-sm text-muted-foreground">Version details are unavailable.</p>
	{/if}

	<dl class="divide-y text-sm">
		{#each rows as row (row.label)}
			<div class="flex items-baseline justify-between gap-4 px-3 py-2">
				<dt class="shrink-0 text-muted-foreground">{row.label}</dt>
				<dd class="truncate text-right tabular-nums">{row.value}</dd>
			</div>
		{/each}
	</dl>

	{#snippet footer()}
		<Button variant="ghost" disabled={!info} onclick={copyInfo}>
			{#if copied}
				<span in:scale={{ duration: 300, start: 0.85 }}>
					<Check />
				</span>
			{:else}
				<span in:scale={{ duration: 300, start: 0.85 }}>
					<Clipboard />
				</span>
			{/if}

			<span class="text-sm">Copy info</span>
		</Button>

		<Button command="close" commandfor={dialogs.about}>Close</Button>
	{/snippet}
</Dialog>
