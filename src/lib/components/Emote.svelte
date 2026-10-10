<script lang="ts">
	import { Tooltip } from "bits-ui";

	import type { Emote } from "#lib/emotes.js";

	import { settings } from "#lib/settings/index.js";

	import type { EmoteTether } from "./EmoteTooltip.svelte";

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
			<img
				class="col-start-1 row-start-1 object-contain"
				srcset={emote.srcset.join(", ")}
				alt={emote.displayName}
				width={emote.displayWidth}
				height={emote.displayHeight}
				decoding="async"
			/>

			{#each layers as layer}
				<img
					class="col-start-1 row-start-1 m-auto object-contain"
					srcset={layer.srcset.join(", ")}
					alt={layer.displayName}
					width={layer.displayWidth}
					height={layer.displayHeight}
					decoding="async"
				/>
			{/each}
		</button>
	{/snippet}
</Tooltip.Trigger>
