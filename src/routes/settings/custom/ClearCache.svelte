<script lang="ts">
	import { invoke } from "@tauri-apps/api/core";
	import { onMount } from "svelte";
	import { clear } from "tauri-plugin-cache-api";
	import Button from "$lib/components/ui/Button.svelte";
	import Broom from "~icons/ph/broom";

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

	onMount(async () => {
		bytes = await invoke<number>("get_cache_size");
	});
</script>

<Button
	class="max-w-min"
	size="sm"
	disabled={!bytes}
	onclick={async () => {
		await clear();
		bytes = await invoke<number>("get_cache_size");
	}}
>
	<Broom /> Free up {size}
</Button>
