<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { LogicalPosition } from "@tauri-apps/api/dpi";
	import { appLogDir } from "@tauri-apps/api/path";
	import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
	import { writeText } from "@tauri-apps/plugin-clipboard-manager";
	import { openPath } from "@tauri-apps/plugin-opener";
	import { platform as getPlatform } from "@tauri-apps/plugin-os";
	import { scale } from "svelte/transition";
	import ArrowSquareOut from "~icons/ph/arrow-square-out";
	import Check from "~icons/ph/check";
	import Clipboard from "~icons/ph/clipboard";
	import FolderOpen from "~icons/ph/folder-open";
	import { page } from "$app/state";
	import { app } from "$lib/app.svelte";
	import { Button } from "$lib/components/ui/button";

	let copied = $state(false);

	const platform = getPlatform();

	async function detach() {
		new WebviewWindow("settings", {
			url: "/settings?detached",
			title: "Settings",
			hiddenTitle: true,
			titleBarStyle: "overlay",
			trafficLightPosition: new LogicalPosition(10, 15),
			decorations: platform !== "windows",
		});

		app.history.back();
	}

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

<Button
	class="text-muted-foreground"
	variant="ghost"
	disabled={page.data.detached}
	onclick={detach}
>
	<ArrowSquareOut />
	<span class="text-sm">Popout settings</span>
</Button>

<Button class="text-muted-foreground" variant="ghost" onclick={openLogDir}>
	<FolderOpen />
	<span class="text-sm">Open logs</span>
</Button>

<Button class="text-muted-foreground px-3" variant="ghost" onclick={copyDebugInfo}>
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
