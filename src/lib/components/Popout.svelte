<script lang="ts" generics="T extends Record<string, any>">
	import type { Component } from "svelte";

	import EmoteTooltip, { provideEmoteTooltip } from "./emote/EmoteTooltip.svelte";
	import HintTooltip, { provideHintTooltip } from "./ui/HintTooltip.svelte";

	interface Props {
		component: Component<T>;
		props: T;
	}

	const { component: Content, props }: Props = $props();

	// Popouts are mounted on their own rather than under the root layout, so
	// they provide the per-window context it would have.
	const emoteTooltip = provideEmoteTooltip();
	const hintTooltip = provideHintTooltip();
</script>

<EmoteTooltip controller={emoteTooltip} />
<HintTooltip controller={hintTooltip} />

<Content {...props} />
