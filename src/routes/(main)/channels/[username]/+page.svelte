<script lang="ts">
	import { app } from "$lib/app.svelte";
	import SplitNode from "$lib/components/split/SplitNode.svelte";
	import SplitView from "$lib/components/split/SplitView.svelte";
	import { emptyPaneId, type SplitDirection } from "$lib/split-layout";

	const fallbackPaneId = emptyPaneId();

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
		if (!targetId) return;

		const channel = app.channels.get(targetId);
		if (channel) {
			app.splits.focused = channel.id;
			channel.chat.input?.focus();
		} else {
			app.splits.focused = targetId;
		}
	}
</script>

<svelte:window onkeydown={navigateSplit} />

<div class="h-full">
	{#if app.splits.root}
		<SplitNode bind:node={app.splits.root} />
	{:else}
		<SplitView id={fallbackPaneId} />
	{/if}
</div>
