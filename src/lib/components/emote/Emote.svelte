<script lang="ts">
	import { TooltipTrigger } from "@ui-sdk/svelte/tooltip";

	import type { Emote } from "#lib/emotes.js";

	import { settings } from "#lib/settings.js";

	import EmoteLayers from "./EmoteLayers.svelte";
	import { getEmoteTooltip } from "./EmoteTooltip.svelte";

	interface Props {
		emote: Emote;
		layers?: Emote[];
	}

	const { emote, layers = [] }: Props = $props();

	const tooltip = getEmoteTooltip();
	const payload = $derived({ emote, layers });
</script>

<TooltipTrigger controller={tooltip} {payload}>
	{#snippet render({ props })}
		<button
			class="emote -my-2 inline-grid align-middle"
			data-provider={emote.provider}
			type="button"
			style:padding="{settings.state['chat.emotes.padding']}px"
			{...props}
		>
			<EmoteLayers {emote} {layers} size="display" />
		</button>
	{/snippet}
</TooltipTrigger>
