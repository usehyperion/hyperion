<script lang="ts">
	import type { Emote } from "#lib/emotes.js";

	import { emoteSources } from "#lib/emotes.js";

	interface Props {
		emotes: Emote[];
		onpick: (name: string) => void;
	}

	const { emotes, onpick }: Props = $props();

	function toImageSet(emote: Emote) {
		const candidates = emoteSources(emote).map(
			({ url, density }) => `url("${url}") ${density}`,
		);
		return `image-set(${candidates.join(", ")})`;
	}
</script>

{#each emotes as emote (`${emote.displayName}:${emote.id}`)}
	<button
		class="w-full"
		title={emote.displayName}
		type="button"
		onclick={() => onpick(emote.displayName)}
	>
		<div
			class="aspect-square w-full bg-contain bg-center bg-no-repeat"
			style:background-image={toImageSet(emote)}
		></div>
	</button>
{/each}
