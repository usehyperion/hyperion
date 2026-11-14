<script lang="ts">
	import { appCacheDir } from "@tauri-apps/api/path";
	import { openPath } from "@tauri-apps/plugin-opener";
	import { onMount } from "svelte";

	import Broom from "~icons/ph/broom";
	import FolderOpen from "~icons/ph/folder-open";

	import { clear, size as getSize } from "#lib/cache.js";
	import Button from "#lib/components/ui/Button.svelte";

	let bytes = $state(0);

	const size = $derived.by(() => {
		if (bytes >= 1024 * 1024) {
			return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		}

		if (bytes >= 1024) {
			return `${Math.round(bytes / 1024)} KB`;
		}

		return `${bytes} bytes`;
	});

	async function clearCache() {
		await clear();
		bytes = await getSize();
	}

	onMount(async () => {
		bytes = await getSize();
	});
</script>

<div class="flex items-center gap-x-2">
	<Button size="sm" disabled={!bytes} onclickwait={clearCache}>
		<Broom /> Free up {size}
	</Button>

	{#if import.meta.env.DEV}
		<Button size="sm" variant="outline" onclickwait={async () => openPath(await appCacheDir())}>
			<FolderOpen /> Open folder
		</Button>
	{/if}
</div>
