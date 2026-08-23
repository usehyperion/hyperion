<script lang="ts">
	import type { Emote } from "$lib/emotes";

	interface Props {
		emotes: Emote[];
		onpick: (name: string) => void;
	}

	const { emotes, onpick }: Props = $props();

	function toImageSet(srcset: string[]) {
		const candidates: string[] = [];

		for (const src of srcset) {
			const [url, density] = src.split(" ");
			candidates.push(`url("${url}") ${density}`);
		}

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
			style:background-image={toImageSet(emote.srcset)}
		></div>
	</button>
{/each}
