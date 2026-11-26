<script lang="ts" module>
	import type { HighlightConfig } from "#lib/highlights.js";

	interface Style {
		label: string;
		value: HighlightConfig["style"];
	}

	export const STYLES: Style[] = [
		{ label: "Default", value: "default" },
		{ label: "Compact", value: "compact" },
		{ label: "Background", value: "background" },
	];
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import ColorPicker from "#lib/components/ui/ColorPicker.svelte";
	import Popover from "#lib/components/ui/Popover.svelte";
	import {
		Item as SegmentedControlItem,
		Root as SegmentedControl,
	} from "#lib/components/ui/segmented-control/index.js";

	interface Props {
		label: string;
		config: HighlightConfig;
		footer?: Snippet;
	}

	let { label, config = $bindable(), footer }: Props = $props();
</script>

<Popover
	class="flex w-64 flex-col gap-3"
	side="bottom"
	align="start"
	aria-label="{label} appearance"
>
	{#snippet trigger(props)}
		<button
			{...props}
			class="flex size-control-sm shrink-0 cursor-pointer items-center justify-center rounded-[5px] control-focus transition-colors hover:bg-surface-3 aria-expanded:bg-surface-3"
			title="Style and color"
			aria-label="{label} style and color"
		>
			<span
				class={[
					"relative size-3.5 overflow-hidden rounded-[3px] transition-opacity group-data-[enabled=false]/row:opacity-40",
					config.style === "background"
						? "bg-(--highlight)/40"
						: "border-[1.5px] border-(--highlight)",
				]}
				aria-hidden="true"
				style:--highlight={config.color}
			>
				{#if config.style === "default"}
					<span class="absolute inset-x-0 top-0 h-1 bg-(--highlight)/60"></span>
				{/if}
			</span>
		</button>
	{/snippet}

	<SegmentedControl class="w-full" size="sm" aria-label="Style" bind:value={config.style}>
		{#each STYLES as style (style.value)}
			<SegmentedControlItem class="px-1 text-caption" value={style.value}>
				{style.label}
			</SegmentedControlItem>
		{/each}
	</SegmentedControl>

	<ColorPicker aria-label="{label} color" bind:value={config.color} />

	{#if footer}
		<div class="-mx-3 -mb-3 border-t border-line p-1">
			{@render footer()}
		</div>
	{/if}
</Popover>
