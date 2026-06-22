<script lang="ts" module>
	export { details, hide };
</script>

<script lang="ts">
	import type { Component } from "svelte";
	import CaretDown from "~icons/ph/caret-down";
	import CaretUp from "~icons/ph/caret-up";
	import X from "~icons/ph/x";
	import { buttonVariants } from "../ui/button";
	import * as Tooltip from "../ui/tooltip";
	import NoticeAction from "./NoticeAction.svelte";

	interface Props {
		icon: Component;
		tooltip: string;
		onclick: () => void;
	}

	const { icon: Icon, tooltip, onclick }: Props = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger
		class={buttonVariants({ class: "size-5", size: "icon-sm", variant: "ghost" })}
		{onclick}
		aria-label={tooltip}
	>
		<Icon class="size-3.5" />
	</Tooltip.Trigger>

	<Tooltip.Content side="top">
		{tooltip}
	</Tooltip.Content>
</Tooltip.Root>

{#snippet details(expanded: boolean, onclick: () => void)}
	<NoticeAction
		icon={expanded ? CaretUp : CaretDown}
		tooltip={expanded ? "Collapse" : "Expand"}
		{onclick}
	/>
{/snippet}

{#snippet hide(onclick: () => void)}
	<NoticeAction icon={X} tooltip="Hide" {onclick} />
{/snippet}
