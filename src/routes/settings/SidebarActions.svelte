<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { appLogDir } from "@tauri-apps/api/path";
	import { writeText } from "@tauri-apps/plugin-clipboard-manager";
	import { openPath } from "@tauri-apps/plugin-opener";
	import { scale } from "svelte/transition";
	import Button from "$lib/components/ui/Button.svelte";
	import Check from "~icons/ph/check";
	import Clipboard from "~icons/ph/clipboard";
	import FolderOpen from "~icons/ph/folder-open";

	let copied = $state(false);

	async function openLogDir() {
		await openPath(await appLogDir());
	}

	async function copyDebugInfo() {
		const info = await invoke<string>("get_debug_info");

		// Need to use clipboard plugin because of timing sensitivity with the
		// Clipboard API
		await writeText(info);
		copied = true;

		setTimeout(() => {
			copied = false;
		}, 2000);
	}
</script>

<Button class="text-muted-foreground" variant="ghost" onclick={openLogDir}>
	<FolderOpen />
	<span class="text-sm">Open logs</span>
</Button>

<Button class="px-3 text-muted-foreground" variant="ghost" onclick={copyDebugInfo}>
	{#if copied}
		<span in:scale={{ duration: 300, start: 0.85 }}>
			<Check />
		</span>
	{:else}
		<span in:scale={{ duration: 300, start: 0.85 }}>
			<Clipboard />
		</span>
	{/if}

	<span class="text-sm">Copy debug info</span>
</Button>
