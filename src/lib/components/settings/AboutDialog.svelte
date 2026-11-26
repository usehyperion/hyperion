<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { DialogClose, DialogTitle } from "@ui-sdk/svelte/dialog";
	import { scale } from "svelte/transition";

	import Button from "#lib/components/ui/Button.svelte";
	import Dialog from "#lib/components/ui/Dialog.svelte";
	import { dialogs } from "#lib/dialog.js";
	import { IconCopied, IconCopy } from "#lib/icons.js";
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

	async function onOpenChange(open: boolean) {
		if (!open) return;

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

<Dialog id={dialogs.about} class="max-w-sm" {onOpenChange}>
	{#snippet header()}
		<div class="flex items-center gap-2.5">
			<img class="size-8" src="/logo.svg" alt="" />

			<DialogTitle class="font-geist text-body font-semibold">Hyperion</DialogTitle>
		</div>
	{/snippet}

	{#if failed && !info}
		<p class="text-detail text-fg-muted">Version details are unavailable.</p>
	{/if}

	<dl class="divide-y divide-line rounded-control border border-line bg-inset text-detail">
		{#each rows as row (row.label)}
			<div class="flex items-baseline justify-between gap-4 px-2.5 py-1.5">
				<dt class="shrink-0 text-fg-muted">{row.label}</dt>
				<dd class="truncate text-right font-mono tabular-nums">{row.value}</dd>
			</div>
		{/each}
	</dl>

	{#snippet footer()}
		<Button class="mr-auto" size="sm" variant="ghost" disabled={!info} onclick={copyInfo}>
			{#if copied}
				<span in:scale={{ duration: 300, start: 0.85 }}>
					<IconCopied />
				</span>
			{:else}
				<span in:scale={{ duration: 300, start: 0.85 }}>
					<IconCopy />
				</span>
			{/if}

			Copy info
		</Button>

		<DialogClose>
			{#snippet render({ props })}
				<Button {...props} size="sm" variant="secondary">Close</Button>
			{/snippet}
		</DialogClose>
	{/snippet}
</Dialog>
