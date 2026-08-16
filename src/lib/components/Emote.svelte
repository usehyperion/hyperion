<script lang="ts">
	import type { Emote } from "$lib/emotes";
	import { settings } from "$lib/settings";

	interface Props {
		emote: Emote;
		layers?: Emote[];
	}

	const { emote, layers = [] }: Props = $props();

	const srcset = $derived(emote.srcset.join(", "));
</script>

<button
	class="-my-2 inline-grid align-middle"
	type="button"
	data-tooltip-emote
	data-tooltip-width={emote.width}
	data-tooltip-height={emote.height}
	style:padding="{settings.state['chat.emotes.padding']}px"
>
	<img
		class="col-start-1 row-start-1 object-contain"
		{srcset}
		alt={emote.name}
		width={emote.displayWidth}
		height={emote.displayHeight}
		decoding="async"
	/>

	{#each layers as layer}
		<img
			class="col-start-1 row-start-1 m-auto object-contain"
			srcset={layer.srcset.join(", ")}
			alt={layer.name}
			width={layer.displayWidth}
			height={layer.displayHeight}
			decoding="async"
		/>
	{/each}
</button>
