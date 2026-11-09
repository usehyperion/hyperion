<script lang="ts">
	import { Tooltip } from "bits-ui";

	import type { Emote } from "#lib/emotes.js";

	import { settings } from "#lib/settings.js";

	import type { EmoteTether } from "./EmoteTooltip.svelte";

	import EmoteLayers from "./EmoteLayers.svelte";

	interface Props {
		emote: Emote;
		layers?: Emote[];
		tether: EmoteTether;
	}

	const { emote, layers = [], tether }: Props = $props();

	const payload = $derived({ emote, layers });
</script>

<Tooltip.Trigger {tether} {payload}>
	{#snippet child({ props })}
		<button
			class="-my-2 inline-grid align-middle"
			type="button"
			style:padding="{settings.state['chat.emotes.padding']}px"
			{...props}
		>
			<EmoteLayers {emote} {layers} size="display" />
		</button>
	{/snippet}
</Tooltip.Trigger>
