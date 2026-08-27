<script lang="ts">
	import { Tooltip } from "bits-ui";
	import type { Component } from "svelte";
	import type { UserMessage } from "$lib/models/message/user-message.svelte";
	import { confirmBan, timeoutDuration, timeoutLabel } from "$lib/moderation";
	import { settings } from "$lib/settings";
	import ArrowBendUpLeft from "~icons/ph/arrow-bend-up-left";
	import Clipboard from "~icons/ph/clipboard";
	import Clock from "~icons/ph/clock";
	import Gavel from "~icons/ph/gavel";
	import Trash from "~icons/ph/trash";
	import Button from "../ui/Button.svelte";
	import Separator from "../ui/Separator.svelte";

	interface Props {
		class?: string;
		message: UserMessage;
	}

	interface Action {
		icon: Component;
		label: string;
		danger?: boolean;
		onclick?: () => void;
		onclickwait?: () => Promise<unknown>;
	}

	const { class: className, message }: Props = $props();

	const qaTether = Tooltip.createTether<Action>();

	function copy() {
		navigator.clipboard.writeText(message.text);
	}

	function reply() {
		message.channel.chat.replyTarget = message;
		message.channel.chat.input?.focus();
	}

	async function timeout() {
		await message.viewer?.timeout({ duration: timeoutDuration() });
	}

	async function ban() {
		if (!message.viewer) return;
		if (!(await confirmBan(message.viewer.displayName))) return;

		await message.viewer.ban();
	}
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
			{@render action({ icon: Clipboard, label: "Copy", onclick: copy })}
			{@render action({ icon: ArrowBendUpLeft, label: "Reply", onclick: reply })}

			{#if message.actionable && settings.state["moderation.quickActions.show"]}
				<div class="h-4">
					<Separator orientation="vertical" class="mx-1 self-center" />
				</div>

				{@render action({
					icon: Trash,
					label: "Delete",
					danger: true,
					onclickwait: () => message.delete(),
				})}

				{@render action({
					icon: Clock,
					label: `Timeout (${timeoutLabel()})`,
					danger: true,
					onclickwait: timeout,
				})}

				{@render action({
					icon: Gavel,
					label: "Ban",
					danger: true,
					onclickwait: ban,
				})}
			{/if}
		</div>

		<Tooltip.Portal>
			<Tooltip.Content collisionPadding={6} sideOffset={8}>
				<Tooltip.Arrow class="text-neutral-800" />
				{payload?.label}
			</Tooltip.Content>
		</Tooltip.Portal>
	{/snippet}
</Tooltip.Root>

{#snippet action(config: Action)}
	<Tooltip.Trigger tether={qaTether} payload={config}>
		{#snippet child({ props })}
			<Button
				class={[
					"text-muted-foreground",
					config.danger
						? "hover:bg-destructive/10 hover:text-destructive"
						: "hover:text-foreground",
				]}
				size="icon-sm"
				variant="ghost"
				aria-label={config.label}
				{...props}
				onclick={config.onclick}
				onclickwait={config.onclickwait}
			>
				<config.icon />
			</Button>
		{/snippet}
	</Tooltip.Trigger>
{/snippet}
