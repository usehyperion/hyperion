<script lang="ts">
	import type { Snippet } from "svelte";

	import type { HighlightConfig } from "#lib/highlights.js";

	import Switch from "#lib/components/ui/Switch.svelte";

	import Appearance from "./Appearance.svelte";

	interface Props {
		label: string;
		config: HighlightConfig;
		children: Snippet;
		footer?: Snippet;
		trailing?: Snippet;
	}

	let { label, config = $bindable(), children, footer, trailing }: Props = $props();
</script>

<li class="group/row flex h-9 items-center gap-1.5 ps-1.5 pe-2.5" data-enabled={config.enabled}>
	<Appearance {label} {footer} bind:config />

	<div class="flex min-w-0 flex-1 items-center gap-2">
		{@render children()}
	</div>

	<Switch aria-label="Highlight {label}" bind:checked={config.enabled} />

	{@render trailing?.()}
</li>
