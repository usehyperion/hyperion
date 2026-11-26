<script lang="ts">
	import { TooltipTrigger } from "@ui-sdk/svelte/tooltip";

	import type { Emote } from "#lib/emotes.js";

	import { settings } from "#lib/settings.js";

	import EmoteLayers from "./EmoteLayers.svelte";
	import { emoteTooltip } from "./EmoteTooltip.svelte";

	interface Props {
		emote: Emote;
		layers?: Emote[];
	}

	const { emote, layers = [] }: Props = $props();

	const payload = $derived({ emote, layers });
</script>

<TooltipTrigger controller={emoteTooltip} {payload}>
	{#snippet render({ props })}
		<button
			class="-my-2 inline-grid align-middle"
			type="button"
			style:padding="{settings.state['chat.emotes.padding']}px"
			{...props}
		>
			<EmoteLayers {emote} {layers} size="display" />
		</button>
	{/snippet}
</TooltipTrigger>
