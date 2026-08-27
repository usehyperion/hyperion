<script lang="ts">
	import type { Emote } from "$lib/emotes";
	import { settings } from "$lib/settings";
	import SevenTV from "~icons/logos/7tv";
	import BetterTTV from "~icons/logos/bttv";
	import FrankerFaceZ from "~icons/logos/ffz";
	import Twitch from "~icons/logos/twitch";
	import Tooltip from "./ui/Tooltip.svelte";

	interface Props {
		emote: Emote;
		layers?: Emote[];
	}

	const { emote, layers = [] }: Props = $props();

	const PROVIDER_ICONS = {
		Twitch,
		"7TV": SevenTV,
		BetterTTV: BetterTTV,
		FrankerFaceZ: FrankerFaceZ,
	};

	const srcset = $derived(emote.srcset.join(", "));
	const ProviderIcon = $derived(PROVIDER_ICONS[emote.provider]);
</script>

<Tooltip class="max-w-40 p-0">
	{#snippet trigger(props)}
		<button
			class="-my-2 inline-grid align-middle"
			type="button"
			style:padding="{settings.state['chat.emotes.padding']}px"
			{...props}
		>
			<img
				class="col-start-1 row-start-1 object-contain"
				{srcset}
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
			<p class="text-xs wrap-anywhere text-foreground-on-tooltip-subtle">
				Alias of <span class="font-medium">{emote.name}</span>
			</p>
		{/if}

		<div
			class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-foreground-on-tooltip-subtle"
		>
			<span class="flex items-center gap-1">
				<ProviderIcon class="size-3" />
				{emote.provider}
			</span>

			<span class="tabular-nums">&bullet; {emote.width}&times;{emote.height}</span>

			{#if emote.zeroWidth}
				<span
					class="rounded bg-surface-tooltip-raised px-1 py-px text-[10px] text-foreground-on-tooltip"
				>
					Zero-width
				</span>
			{/if}
		</div>
	</div>

	{#if layers.length}
		<div class="space-y-1 border-t border-border-tooltip px-3 py-2">
			<p class="text-[10px] tracking-wide text-foreground-on-tooltip-subtle uppercase">
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
</Tooltip>
