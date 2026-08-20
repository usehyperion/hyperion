<script lang="ts" module>
	export { details, hide };
</script>

<script lang="ts">
	import type { Component } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";
	import { cn } from "tailwind-variants";
	import CaretDown from "~icons/ph/caret-down";
	import CaretUp from "~icons/ph/caret-up";
	import X from "~icons/ph/x";
	import { buttonVariants } from "../ui/Button.svelte";
	import Tooltip from "../ui/Tooltip.svelte";
	import NoticeAction from "./NoticeAction.svelte";

	interface Props extends HTMLButtonAttributes {
		icon: Component;
		tooltip: string;
	}

	const { icon: Icon, tooltip, ...rest }: Props = $props();
</script>

<Tooltip>
	{#snippet trigger(register)}
		<button
			class={cn(buttonVariants({ size: "icon-sm", variant: "ghost" }), "size-5")}
			aria-label={tooltip}
			{...rest}
			{@attach register}
		>
			<Icon class="size-3.5" />
		</button>
	{/snippet}

	{tooltip}
</Tooltip>

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
