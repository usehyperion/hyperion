<script lang="ts">
	import { DialogTrigger } from "@ui-sdk/svelte/dialog";
	import { type ComponentProps, tick } from "svelte";
	import type { KeyboardEventHandler } from "svelte/elements";

	import type { Chat } from "#lib/models/chat.svelte.js";

	import { Completer } from "#lib/completer.svelte.js";
	import { dialogController, dialogs } from "#lib/dialog.js";
	import { CommandError } from "#lib/errors/command-error.js";
	import { IconPoll, IconPrediction } from "#lib/icons.js";

	import EmotePicker from "../emote-picker/EmotePicker.svelte";
	import Suggestions from "../Suggestions.svelte";
	import Button from "../ui/Button.svelte";
	import InputGroup from "../ui/InputGroup.svelte";
	import ChatError from "./ChatError.svelte";
	import ChatReply from "./ChatReply.svelte";
	import Restrictions from "./Restrictions.svelte";

	const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

	interface Props extends Omit<
		ComponentProps<typeof InputGroup>,
		"value" | "ref" | "groupRef" | "end"
	> {
		chat: Chat;
	}

	const { class: className, chat, ...rest }: Props = $props();

	const chatButton = "[&_svg:not([class*='size-'])]:size-4";

	let anchor = $state<HTMLDivElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let completer = $state<Completer>();

	let historyIdx = $state(-1);
	let error = $state<string>("");
	let suggesting = $state(false);

	const banned = $derived(chat.channel.banned);

	$effect(() => {
		void error;

		const timeout = setTimeout(() => {
			error = "";
		}, 5000);

		return () => clearTimeout(timeout);
	});

	const send: KeyboardEventHandler<HTMLInputElement> = async (event) => {
		if (!completer || event.defaultPrevented || suggesting) return;

		const input = event.currentTarget;

		if (event.key === "Tab") {
			event.preventDefault();
			completer.tab(event.shiftKey);
		} else if (event.key === "Escape") {
			chat.replyTarget = null;
		} else if (event.key === "ArrowUp") {
			// Keep the caret from jumping to the start of the input.
			event.preventDefault();

			if (!chat.history.length) return;

			if (historyIdx === -1) {
				historyIdx = chat.history.length - 1;
			} else if (historyIdx > 0) {
				historyIdx--;
			}

			chat.value = chat.history[historyIdx];

			await tick();
			input.setSelectionRange(chat.value.length, chat.value.length);
		} else if (event.key === "ArrowDown") {
			if (historyIdx === -1) return;

			if (historyIdx < chat.history.length - 1) {
				historyIdx++;
				chat.value = chat.history[historyIdx];
			} else {
				historyIdx = -1;
				chat.value = "";
			}

			input.setSelectionRange(chat.value.length, chat.value.length);
		} else if (event.key === "Enter") {
			event.preventDefault();

			const message = chat.value.trim();

			if (!message) return;
			if (!event.ctrlKey) chat.value = "";

			historyIdx = -1;
			chat.history.push(message);

			try {
				await chat.send(message);
			} catch (err) {
				if (err instanceof CommandError) {
					error = err.message;
				} else {
					error = "An unexpected error occurred.";
				}
			}
		} else if (completer.suggestions.length && !MODIFIER_KEYS.has(event.key)) {
			completer.reset();
		}
	};
</script>

<Suggestions
	{input}
	{anchor}
	search={(trigger, query) => completer?.suggest(trigger, query) ?? []}
	bind:open={suggesting}
/>

{#if chat.replyTarget}
	<ChatReply target={chat.replyTarget} oncancel={() => (chat.replyTarget = null)} />
{:else if error}
	<ChatError message={error} />
{/if}

<div class="flex flex-col gap-1.5">
	<InputGroup
		class={[
			"chat-input h-12 rounded-xl",
			(chat.replyTarget || error) && "rounded-t-none",
			className,
		]}
		inputClass="px-3"
		aria-label="Chat message"
		autocapitalize="off"
		autocorrect="off"
		disabled={banned}
		maxlength={500}
		placeholder={banned ? "You are banned from the channel" : "Send a message"}
		onkeydown={send}
		onmousedown={() => completer?.reset()}
		{...rest}
		bind:value={chat.value}
		bind:ref={
			() => input,
			(el) => {
				input = el;
				chat.input = el;
				completer = el ? new Completer(chat, el) : undefined;
			}
		}
		bind:groupRef={anchor}
	>
		{#snippet end()}
			<span class="flex items-center gap-0.5 pe-1">
				{#if chat.channel.isMod}
					<DialogTrigger controller={dialogController(dialogs.poll(chat.channel.id))}>
						{#snippet render({ props })}
							<Button
								{...props}
								class={chatButton}
								size="icon"
								variant="ghost"
								aria-label="Create poll"
							>
								<IconPoll />
							</Button>
						{/snippet}
					</DialogTrigger>

					<DialogTrigger
						controller={dialogController(dialogs.prediction(chat.channel.id))}
					>
						{#snippet render({ props })}
							<Button
								{...props}
								class={chatButton}
								size="icon"
								variant="ghost"
								aria-label="Create prediction"
							>
								<IconPrediction />
							</Button>
						{/snippet}
					</DialogTrigger>
				{/if}

				<EmotePicker channel={chat.channel} />
			</span>
		{/snippet}
	</InputGroup>

	<div class="chat-input-footer flex items-center justify-between px-1">
		<div class="character-counter text-detail text-fg-muted tabular-nums">
			<span class:text-fg={chat.value.length === 500}>{chat.value.length}</span>
			/ 500
		</div>

		<Restrictions {chat} />
	</div>
</div>
