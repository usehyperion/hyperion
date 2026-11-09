<script lang="ts">
	import { Tooltip } from "bits-ui";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import {
		messageActions as actions,
		runAction,
		type MessageAction,
	} from "#lib/menus/message-actions.js";
	import { settings } from "#lib/settings/index.js";

	import Button from "../ui/Button.svelte";
	import Separator from "../ui/Separator.svelte";

	interface Props {
		class?: string;
		message: UserMessage;
	}

	const { class: className, message }: Props = $props();

	const qaTether = Tooltip.createTether<MessageAction>();
</script>

<Tooltip.Root tether={qaTether}>
	{#snippet children({ payload })}
		<div
			class={[
				"flex items-center gap-px rounded-lg bg-popover p-1 smooth-shadow-ring-md",
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

		<Tooltip.Portal>
			<Tooltip.Content collisionPadding={6} sideOffset={8}>
				<Tooltip.Arrow class="text-neutral-800" />
				{payload?.label()}
			</Tooltip.Content>
		</Tooltip.Portal>
	{/snippet}
</Tooltip.Root>

{#snippet action(config: MessageAction)}
	<Tooltip.Trigger tether={qaTether} payload={config}>
		{#snippet child({ props })}
			<Button
				class={[
					"text-muted-foreground",
					config.moderation
						? "hover:bg-destructive/10 hover:text-destructive"
						: "hover:text-foreground",
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
	</Tooltip.Trigger>
{/snippet}
