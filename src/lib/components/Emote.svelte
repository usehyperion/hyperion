<script lang="ts">
	import type { Emote } from "$lib/emotes";
	import { settings } from "$lib/settings";
	import Tooltip from "./ui/Tooltip.svelte";

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
	data-slot="tooltip-trigger"
	style:padding="{settings.state['chat.emotes.padding']}px"
>
	<img
		class="col-start-1 row-start-1 object-contain"
		{srcset}
		alt={emote.name}
		decoding="async"
	/>

	{#each layers as layer}
		<img
			class="col-start-1 row-start-1 m-auto object-contain"
			srcset={layer.srcset.join(", ")}
			alt={layer.name}
			decoding="async"
		/>
	{/each}
</button>

<Tooltip side="top">
	<div class="flex flex-col items-center">
		<img {srcset} alt={emote.name} width={emote.width} height={emote.height} decoding="async" />
		{emote.name}
	</div>
</Tooltip>
