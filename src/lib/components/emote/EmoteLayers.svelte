<script lang="ts">
	import type { Emote } from "#lib/emotes.js";

	interface Props {
		class?: string;
		emote: Emote;
		layers: Emote[];
		size: "display" | "natural";
	}

	const { class: className, emote, layers, size }: Props = $props();
</script>

{#each [emote, ...layers] as image, i}
	<img
		class={["col-start-1 row-start-1 object-contain", i > 0 && "m-auto", className]}
		srcset={image.srcset.join(", ")}
		alt={image.displayName}
		width={size === "display" ? image.displayWidth : image.width}
		height={size === "display" ? image.displayHeight : image.height}
		decoding="async"
	/>
{/each}
