<script lang="ts">
	import type { Emote } from "#lib/emotes.js";

	interface Props {
		emote: Emote;
		layers: Emote[];

		/**
		 * Whether the images are sized as the emote occupies inline in chat or
		 * at their natural size.
		 */
		size: "display" | "natural";
		class?: string;
	}

	const { emote, layers, size, class: className }: Props = $props();
</script>

<!-- Rendered into a grid container owned by the parent so that the layers
stack on top of the emote. -->
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
