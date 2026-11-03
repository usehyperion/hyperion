<script lang="ts">
	import { platform as getPlatform } from "@tauri-apps/plugin-os";

	const { children } = $props();

	const platform = getPlatform();
</script>

<!--
	Popout windows use an overlay title bar, so this strip both reserves space
	for the native controls and gives the window something to drag by.
-->
<div
	class={[
		"flex min-h-title-bar w-full shrink-0 items-center border-b",
		platform === "macos" ? "pl-20" : "pl-3",
	]}
	data-tauri-drag-region
></div>

<main class="grow overflow-y-auto">
	{@render children()}
</main>
