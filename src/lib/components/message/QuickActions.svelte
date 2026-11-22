<script lang="ts">
	import { TooltipTrigger } from "@ui-sdk/svelte/tooltip";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import {
		messageActions as actions,
		runAction,
		type MessageAction,
	} from "#lib/menus/message-actions.js";
	import { settings } from "#lib/settings.js";

	import Button from "../ui/Button.svelte";
	import { hintTooltip } from "../ui/HintTooltip.svelte";
	import Separator from "../ui/Separator.svelte";

	interface Props {
		class?: string;
		message: UserMessage;
	}

	const { class: className, message }: Props = $props();
</script>

<div
	class={[
		"flex items-center gap-px rounded-control border border-line bg-surface-1 p-0.5 shadow-popup",
		"pointer-events-none scale-95 opacity-0 transition-[opacity,scale] duration-150 ease-out-quart",
		"group-hover:pointer-events-auto group-hover:scale-100 group-hover:opacity-100",
		"focus-within:pointer-events-auto focus-within:scale-100 focus-within:opacity-100",
		className,
	]}
	role="group"
	aria-label="Message actions"
>
	{@render action(actions.copy)}
	{@render action(actions.reply)}

	{#if message.actionable && settings.state["moderation.quickActions.show"]}
		<div class="h-4">
			<Separator orientation="vertical" class="mx-1 self-center" />
		</div>

		{@render action(actions.delete)}
		{@render action(actions.timeout)}
		{@render action(actions.ban)}
	{/if}
</div>

{#snippet action(config: MessageAction)}
	<TooltipTrigger controller={hintTooltip} payload={config.label()}>
		{#snippet render({ props })}
			<Button
				class={[
					"text-fg-muted",
					config.moderation ? "hover:bg-danger/10 hover:text-danger" : "hover:text-fg",
				]}
				size="icon-sm"
				variant="ghost"
				aria-label={config.label()}
				disabled={!config.enabled(message)}
				{...props}
				onclickwait={() => runAction(message, config)}
			>
				<config.icon />
			</Button>
		{/snippet}
	</TooltipTrigger>
{/snippet}
