<script lang="ts">
	import SmileySad from "~icons/ph/smiley-sad";

	import type { Emote } from "#lib/emotes.js";

	import EmoteGrid from "./EmoteGrid.svelte";

	interface Props {
		emotes: Emote[];
		onpick: (name: string) => void;
	}

	const { emotes, onpick }: Props = $props();
</script>

{#if emotes.length}
	<div
		class="grid grid-cols-9 content-start gap-1.5 overflow-y-auto p-2"
		data-component="emote-picker-results"
	>
		<EmoteGrid {emotes} {onpick} />
	</div>
{:else}
	<div
		class="flex h-full flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground"
		data-component="emote-picker-results"
		data-empty
	>
		<SmileySad class="mb-2 size-6" data-slot="emote-picker-results-empty-icon" />
		No emotes found.
	</div>
{/if}
