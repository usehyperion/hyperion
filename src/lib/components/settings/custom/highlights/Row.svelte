<script lang="ts">
	import type { Snippet } from "svelte";
	import { decorations } from "$lib/components/message/Highlight.svelte";
	import type { HighlightConfig } from "$lib/settings";
	import Color from "./Color.svelte";
	import StyleSelect from "./Style.svelte";

	interface Props {
		type: keyof typeof decorations;
		id: string;
		label?: string;
		config: HighlightConfig;
		actions?: Snippet;
		badges?: Snippet;
	}

	let { type, id, label, config = $bindable(), actions, badges }: Props = $props();

	const decoration = $derived(decorations[type]);
	const title = $derived(label || decoration.label);
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
				{title}
			>
				{title}
			</span>

			{@render badges?.()}
		</div>

		<div
			class="flex shrink-0 items-center gap-2 @max-[350px]:order-last @max-[350px]:w-full @max-[350px]:**:data-[slot=native-select-wrapper]:flex-1"
		>
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
