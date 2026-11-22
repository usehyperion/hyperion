<script lang="ts" module>
	export { details, hide };
</script>

<script lang="ts">
	import { type DialogController, DialogTrigger } from "@ui-sdk/svelte/dialog";
	import type { Component } from "svelte";
	import type { HTMLButtonAttributes } from "svelte/elements";

	import { IconCollapse, IconExpand, IconHide } from "#lib/icons.js";
	import { cn } from "#lib/util/styles.js";

	import { buttonVariants } from "../ui/Button.svelte";
	import Tooltip from "../ui/Tooltip.svelte";
	import NoticeAction from "./NoticeAction.svelte";

	interface Props extends HTMLButtonAttributes {
		icon: Component;
		tooltip: string;
		dialog?: DialogController;
	}

	const { icon: Icon, tooltip, dialog, disabled, ...rest }: Props = $props();

	const className = cn(buttonVariants({ size: "icon-sm", variant: "ghost" }), "size-5");
</script>

<Tooltip>
	{#snippet trigger(props)}
		{#if dialog}
			<DialogTrigger
				class={className}
				aria-label={tooltip}
				{...props}
				{...rest}
				disabled={disabled ?? undefined}
				controller={dialog}
			>
				<Icon class="size-3.5" />
			</DialogTrigger>
		{:else}
			<button class={className} aria-label={tooltip} {...props} {...rest} {disabled}>
				<Icon class="size-3.5" />
			</button>
		{/if}
	{/snippet}

	{tooltip}
</Tooltip>

{#snippet details(expanded: boolean, onclick: () => void)}
	<NoticeAction
		icon={expanded ? IconCollapse : IconExpand}
		tooltip={expanded ? "Collapse" : "Expand"}
		{onclick}
	/>
{/snippet}

{#snippet hide(onclick: () => void)}
	<NoticeAction icon={IconHide} tooltip="Hide" {onclick} />
{/snippet}
