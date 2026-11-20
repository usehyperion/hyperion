<script lang="ts">
	import { appCacheDir } from "@tauri-apps/api/path";
	import { openPath } from "@tauri-apps/plugin-opener";
	import { onMount } from "svelte";

	import { clear, size as getSize } from "#lib/cache.js";
	import Button from "#lib/components/ui/Button.svelte";
	import { IconClearCache, IconOpenFolder } from "#lib/icons.js";

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
		<IconClearCache /> Free up {size}
	</Button>

	{#if import.meta.env.DEV}
		<Button size="sm" variant="outline" onclickwait={async () => openPath(await appCacheDir())}>
			<IconOpenFolder /> Open folder
		</Button>
	{/if}
</div>
