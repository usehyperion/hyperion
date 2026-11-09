<script lang="ts">
	import type { Snippet } from "svelte";

	import type { HighlightConfig, HighlightType } from "#lib/highlights.js";

	import { HIGHLIGHTS, KEYWORD_HIGHLIGHT } from "#lib/highlights.js";

	import Color from "./Color.svelte";
	import StyleSelect from "./Style.svelte";

	interface Props {
		type: HighlightType | "custom";
		id: string;
		label: string;
		config: HighlightConfig;
		actions?: Snippet;
		badges?: Snippet;
	}

	let { type, id, label, config = $bindable(), actions, badges }: Props = $props();

	const decoration = $derived(type === "custom" ? KEYWORD_HIGHLIGHT : HIGHLIGHTS[type]);
</script>

<div class="@container">
	<div
		class="group flex flex-wrap items-center gap-2 rounded-xl border bg-background/50 px-3 py-2.5 transition-[border-color] duration-200"
		data-enabled={config.enabled}
		style:border-color={config.enabled ? config.color : undefined}
	>
		<div
			class="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity duration-200 group-data-[enabled=false]:opacity-45"
		>
			<span
				class="shrink-0 group-data-[enabled=false]:text-muted-foreground"
				style:color={config.enabled ? config.color : undefined}
			>
				<decoration.icon class="size-4" />
			</span>

			<span
				class="truncate text-sm font-medium group-data-[enabled=false]:text-muted-foreground"
				title={label}
			>
				{label}
			</span>

			{@render badges?.()}
		</div>

		<div class="flex shrink-0 items-center gap-2 @max-[350px]:order-last @max-[350px]:w-full">
			<Color {id} bind:value={config.color} />
			<StyleSelect bind:config />
		</div>

		{#if actions}
			<div
				class="flex shrink-0 items-center gap-0.5 transition-opacity duration-200 group-data-[enabled=false]:opacity-45"
			>
				{@render actions()}
			</div>
		{/if}
	</div>
</div>
