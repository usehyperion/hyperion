<script lang="ts">
	import type { Emote } from "$lib/emotes";
	import SmileySad from "~icons/ph/smiley-sad";
	import EmoteGrid from "./EmoteGrid.svelte";

	interface Props {
		emotes: Emote[];
		onpick: (name: string) => void;
	}

	const { emotes, onpick }: Props = $props();
</script>

{#if emotes.length}
	<div class="grid grid-cols-9 content-start gap-1.5 overflow-y-auto p-2">
		<EmoteGrid {emotes} {onpick} />
	</div>
{:else}
	<div
		class="flex h-full flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground"
	>
		<SmileySad class="mb-2 size-6" />
		No emotes found.
	</div>
{/if}
