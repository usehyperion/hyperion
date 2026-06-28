<script lang="ts">
	import type { HTMLInputAttributes, KeyboardEventHandler } from "svelte/elements";
	import { app } from "$lib/app.svelte";
	import { Completer } from "$lib/completer.svelte";
	import { CommandError } from "$lib/errors/command-error";
	import type { Chat } from "$lib/models/chat.svelte";
	import EmotePicker from "../emote-picker/EmotePicker.svelte";
	import Suggestions from "../Suggestions.svelte";
	import * as InputGroup from "../ui/input-group";
	import ChatError from "./ChatError.svelte";
	import ChatReply from "./ChatReply.svelte";
	import Restrictions from "./Restrictions.svelte";

	interface Props extends HTMLInputAttributes {
		chat: Chat;
	}

	const { class: className, chat, ...rest }: Props = $props();

	let anchor = $state<HTMLElement | null>(null);
	let input = $state<HTMLInputElement | null>(null);
	let completer = $state<Completer>();

	let historyIdx = $state(-1);
	let error = $state<string>("");

	const banned = $derived(app.user?.banned.has(chat.channel.id) ?? false);
	const showSuggestions = $derived(!!completer?.suggestions.length && completer.prefixed);

	$effect(() => {
		void error;

		const timeout = setTimeout(() => {
			error = "";
		}, 5000);

		return () => clearTimeout(timeout);
	});

	const send: KeyboardEventHandler<HTMLInputElement> = async (event) => {
		if (!completer) return;

		const input = event.currentTarget;

		if (event.key === "Tab") {
			event.preventDefault();
			completer.tab(event.shiftKey);
		} else if (event.key === "Escape") {
			chat.replyTarget = null;
		} else if (event.key === "ArrowUp") {
			if (showSuggestions) {
				event.preventDefault();
				completer.prev();
			} else {
				if (!chat.history.length) return;

				if (historyIdx === -1) {
					historyIdx = chat.history.length - 1;
				} else if (historyIdx > 0) {
					historyIdx--;
				}

				chat.value = chat.history[historyIdx];

				setTimeout(() => {
					input.setSelectionRange(chat.value.length, chat.value.length);
				}, 0);
			}
		} else if (event.key === "ArrowDown") {
			if (showSuggestions) {
				event.preventDefault();
				completer.next();
			} else {
				if (historyIdx === -1) return;

				if (historyIdx < chat.history.length - 1) {
					historyIdx++;
					chat.value = chat.history[historyIdx];
				} else {
					historyIdx = -1;
					chat.value = "";
				}

				input.setSelectionRange(chat.value.length, chat.value.length);
			}
		} else if (event.key === "Enter") {
			event.preventDefault();

			if (showSuggestions) {
				completer.complete();
			} else {
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
			}
		} else if (completer.suggestions.length) {
			completer.reset();
		}
	};
</script>

<Suggestions
	{anchor}
	open={showSuggestions}
	index={completer?.current ?? 0}
	suggestions={completer?.suggestions ?? []}
	onselect={() => completer?.complete()}
/>

{#if chat.replyTarget}
	<ChatReply target={chat.replyTarget} oncancel={() => (chat.replyTarget = null)} />
{:else if error}
	<ChatError message={error} />
{/if}

<div class="flex flex-col gap-1.5">
	<InputGroup.Root class="h-12" bind:ref={anchor}>
		<InputGroup.Input
			class={[(chat.replyTarget || error) && "rounded-t-none", className]}
			type="text"
			autocapitalize="off"
			autocorrect="off"
			disabled={banned}
			maxlength={500}
			placeholder={banned ? "You are banned from the channel" : "Send a message"}
			oninput={() => completer?.search()}
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
		/>

		<InputGroup.Addon align="inline-end">
			<EmotePicker channel={chat.channel} />
		</InputGroup.Addon>
	</InputGroup.Root>

	<div class="flex items-center justify-between px-1">
		<div class="text-xs text-muted-foreground tabular-nums">
			<span class:text-foreground={chat.value.length === 500}>{chat.value.length}</span>
			/ 500
		</div>

		<Restrictions {chat} />
	</div>
</div>
