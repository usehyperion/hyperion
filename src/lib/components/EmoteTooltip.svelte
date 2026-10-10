<script lang="ts" module>
	import { Tooltip } from "bits-ui";

	import type { Emote } from "#lib/emotes.js";

	export interface EmotePayload {
		emote: Emote;
		layers: Emote[];
	}

	export type EmoteTether = Tooltip.Tether<EmotePayload>;
</script>

<script lang="ts">
	import SevenTV from "~icons/logos/7tv";
	import BetterTTV from "~icons/logos/bttv";
	import FrankerFaceZ from "~icons/logos/ffz";
	import Twitch from "~icons/logos/twitch";

	interface Props {
		tether: EmoteTether;
	}

	const { tether }: Props = $props();

	const PROVIDER_ICONS = {
		Twitch,
		"7TV": SevenTV,
		BetterTTV: BetterTTV,
		FrankerFaceZ: FrankerFaceZ,
	};
</script>

<Tooltip.Root {tether}>
	{#snippet children({ payload })}
		<Tooltip.Portal>
			<Tooltip.Content class="max-w-40 p-0" sideOffset={6}>
				<Tooltip.Arrow class="text-neutral-800" />

				{#if payload}
					{@render details(payload)}
				{/if}
			</Tooltip.Content>
		</Tooltip.Portal>
	{/snippet}
</Tooltip.Root>

{#snippet details({ emote, layers }: EmotePayload)}
	{@const srcset = emote.srcset.join(", ")}
	{@const ProviderIcon = PROVIDER_ICONS[emote.provider]}

	<div class="flex items-center justify-center p-2">
		<div class="inline-grid">
			<img
				class="col-start-1 row-start-1 max-h-16 max-w-full object-contain"
				{srcset}
				alt={emote.displayName}
				width={emote.width}
				height={emote.height}
				decoding="async"
			/>

			{#each layers as layer}
				<img
					class="col-start-1 row-start-1 m-auto max-h-16 max-w-full object-contain"
					srcset={layer.srcset.join(", ")}
					alt={layer.displayName}
					width={layer.width}
					height={layer.height}
					decoding="async"
				/>
			{/each}
		</div>
	</div>

	<div class="space-y-1 px-3 pb-2.5">
		<p class="text-xs leading-tight font-semibold wrap-anywhere">{emote.displayName}</p>

		{#if emote.alias}
			<p class="text-xs wrap-anywhere text-neutral-400">
				Alias of <span class="font-medium">{emote.name}</span>
			</p>
		{/if}

		<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-neutral-400">
			<span class="flex items-center gap-1">
				<ProviderIcon class="size-3" />
				{emote.provider}
			</span>

			<span class="tabular-nums">&bullet; {emote.width}&times;{emote.height}</span>

			{#if emote.zeroWidth}
				<span class="rounded bg-white/10 px-1 py-px text-[10px] text-neutral-300">
					Zero-width
				</span>
			{/if}
		</div>
	</div>

	{#if layers.length}
		<div class="space-y-1 border-t border-white/10 px-3 py-2">
			<p class="text-[10px] tracking-wide text-neutral-400 uppercase">
				{layers.length === 1 ? "Modifier" : "Modifiers"}
			</p>

			{#each layers as layer}
				{@const LayerIcon = PROVIDER_ICONS[layer.provider]}

				<div class="flex items-center gap-1.5">
					<img
						class="size-4 shrink-0 object-contain"
						srcset={layer.srcset.join(", ")}
						alt={layer.displayName}
						width={layer.displayWidth}
						height={layer.displayHeight}
						decoding="async"
					/>

					<span class="truncate">{layer.displayName}</span>

					<LayerIcon class="size-3 shrink-0 opacity-60" />
				</div>
			{/each}
		</div>
	{/if}
{/snippet}
