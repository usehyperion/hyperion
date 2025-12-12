<script lang="ts">
	import { app } from "$lib/app.svelte.js";
	import { settings } from "$lib/settings";
	import type { SplitDirection } from "$lib/split-layout";
	import SplitNode from "./SplitNode.svelte";
	import SplitView from "./SplitView.svelte";

	app.focused = null;
	settings.state.lastJoined = null;

	async function navigateSplit(event: KeyboardEvent) {
		if (!app.splits.focused || !(event.metaKey || event.ctrlKey)) return;

		let direction: SplitDirection;

		switch (event.key) {
			case "ArrowUp":
				direction = "up";
				break;
			case "ArrowDown":
				direction = "down";
				break;
			case "ArrowLeft":
				direction = "left";
				break;
			case "ArrowRight":
				direction = "right";
				break;
			default:
				return;
		}

		event.preventDefault();

		const targetId = app.splits.navigate(app.splits.focused, direction);

		if (targetId) {
			const channel = app.channels.get(targetId);

			if (channel) {
				app.splits.focused = channel.id;
				channel.chat.input?.focus();
			}
		}
	}
</script>

<svelte:window onkeydown={navigateSplit} />

<div class="h-full">
	{#if app.splits.root}
		<SplitNode bind:node={app.splits.root} />
	{:else}
		<SplitView id="split-root-empty" />
	{/if}
</div>
