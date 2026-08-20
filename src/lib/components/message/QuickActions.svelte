<script lang="ts">
	import type { Component } from "svelte";
	import type { UserMessage } from "$lib/models/message/user-message.svelte";
	import ArrowBendUpLeft from "~icons/ph/arrow-bend-up-left";
	import Clipboard from "~icons/ph/clipboard";
	import Clock from "~icons/ph/clock";
	import Gavel from "~icons/ph/gavel";
	import Trash from "~icons/ph/trash";
	import Button from "../ui/Button.svelte";
	import Separator from "../ui/Separator.svelte";
	import Tooltip from "../ui/Tooltip.svelte";

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

	function copy() {
		navigator.clipboard.writeText(message.text);
	}

	function reply() {
		message.channel.chat.replyTarget = message;
		message.channel.chat.input?.focus();
	}
</script>

<div
	class={[
		"flex items-center gap-px rounded-lg bg-popover p-1 smooth-shadow-ring-md",
		"pointer-events-none opacity-0 transition-opacity duration-100 ease-out-quart",
		"group-hover:pointer-events-auto group-hover:opacity-100",
		"focus-within:pointer-events-auto focus-within:opacity-100",
		className,
	]}
	role="group"
	aria-label="Message actions"
>
	{@render action({ icon: Clipboard, label: "Copy", onclick: copy })}
	{@render action({ icon: ArrowBendUpLeft, label: "Reply", onclick: reply })}

	{#if message.actionable}
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
			label: "Timeout (10 minutes)",
			danger: true,
			onclickwait: async () => await message.viewer?.timeout({ duration: 600 }),
		})}

		{@render action({
			icon: Gavel,
			label: "Ban",
			danger: true,
			onclickwait: async () => await message.viewer?.ban(),
		})}
	{/if}
</div>

{#snippet action(config: Action)}
	<Tooltip>
		{#snippet trigger(register)}
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
				onclick={config.onclick}
				onclickwait={config.onclickwait}
				{@attach register}
			>
				<config.icon />
			</Button>
		{/snippet}

		{config.label}
	</Tooltip>
{/snippet}
