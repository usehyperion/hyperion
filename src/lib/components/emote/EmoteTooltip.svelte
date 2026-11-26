<script lang="ts" module>
	import { createTooltipController } from "@ui-sdk/svelte/tooltip";

	import type { Emote } from "#lib/emotes.js";

	export interface EmotePayload {
		emote: Emote;
		layers: Emote[];
	}

	export const emoteTooltip = createTooltipController<EmotePayload>();
</script>

<script lang="ts">
	import { Tooltip, TooltipContent, type TooltipContentState } from "@ui-sdk/svelte/tooltip";

	import { PROVIDER_ICONS } from "#lib/emotes.js";
	import { cn } from "#lib/util/styles.js";

	import { tooltipContentClass } from "../ui/Tooltip.svelte";
	import EmoteLayers from "./EmoteLayers.svelte";
</script>

<!-- Mounted once for the whole app: every emote is a trigger of this one tooltip. -->
<Tooltip controller={emoteTooltip} delay={300}>
	<TooltipContent
		class={cn(tooltipContentClass, "max-w-40 rounded-control p-0")}
		sideOffset={6}
		collisionPadding={6}
	>
		{#snippet children(state: TooltipContentState<EmotePayload>)}
			{#if state.payload}
				{@render details(state.payload)}
			{/if}
		{/snippet}
	</TooltipContent>
</Tooltip>

{#snippet details({ emote, layers }: EmotePayload)}
	{@const ProviderIcon = PROVIDER_ICONS[emote.provider]}

	<div class="flex items-center justify-center p-2">
		<div class="inline-grid">
			<EmoteLayers {emote} {layers} size="natural" class="max-h-16 max-w-full" />
		</div>
	</div>

	<div class="space-y-0.5 px-2 pb-2">
		<p class="leading-tight font-semibold wrap-anywhere">{emote.displayName}</p>

		{#if emote.alias}
			<p class="wrap-anywhere text-fg-muted">
				Alias of <span class="font-medium text-fg">{emote.name}</span>
			</p>
		{/if}

		<div class="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-fg-muted">
			<span class="flex items-center gap-1">
				<ProviderIcon class="size-3" />
				{emote.provider}
			</span>

			<span class="tabular-nums">&bullet; {emote.width}&times;{emote.height}</span>

			{#if emote.zeroWidth}
				<span class="rounded-xs bg-surface-2 px-1 py-px text-caption text-fg-muted">
					Zero-width
				</span>
			{/if}
		</div>
	</div>

	{#if layers.length}
		<div class="space-y-1 border-t border-line px-2 py-1.5">
			<p class="section-label">
				{layers.length === 1 ? "Modifier" : "Modifiers"}
			</p>

			{#each layers as layer (`${layer.provider}:${layer.id}`)}
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
