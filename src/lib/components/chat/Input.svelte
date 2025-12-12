<script lang="ts">
	import type { HTMLInputAttributes, KeyboardEventHandler } from "svelte/elements";
	import Warning from "~icons/ph/warning";
	import XCircle from "~icons/ph/x-circle";
	import { app } from "$lib/app.svelte";
	import { Completer } from "$lib/completer.svelte";
	import { CommandError } from "$lib/errors/command-error";
	import type { Chat } from "$lib/models/chat.svelte";
	import EmotePicker from "../EmotePicker.svelte";
	import Message from "../message/Message.svelte";
	import Suggestions from "../Suggestions.svelte";
	import * as InputGroup from "../ui/input-group";
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
		chat.input = input;
		completer = new Completer(chat);
	});

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
	<div
		class="bg-muted/50 border-muted has-[+div>input:focus-visible]:border-input rounded-t-md border border-b-0 px-3 pt-1.5 pb-2.5 text-sm transition-colors duration-200"
	>
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground">Replying to:</span>

			<button
				type="button"
				aria-label="Cancel reply"
				onclick={() => (chat.replyTarget = null)}
			>
				<XCircle
					class="text-muted-foreground hover:text-foreground block transition-colors duration-150"
				/>
			</button>
		</div>

		<div class="mt-2">
			<Message message={chat.replyTarget} />
		</div>
	</div>
{:else if error}
	<div
		class="bg-muted/50 border-muted has-[+div>input:focus-visible]:border-input rounded-t-md border border-b-0 px-3 py-2.5 text-sm transition-colors duration-200"
	>
		<div class="flex gap-1">
			<Warning class="mt-px shrink-0 text-yellow-400" />

			<p class="text-muted-foreground">{error}</p>
		</div>
	</div>
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
			bind:ref={input}
		/>

		<InputGroup.Addon align="inline-end">
			<EmotePicker channel={chat.channel} />
		</InputGroup.Addon>
	</InputGroup.Root>

	<div class="flex items-center justify-between px-1">
		<div class="text-muted-foreground text-xs tabular-nums">
			<span class:text-foreground={chat.value.length === 500}>{chat.value.length}</span>
			/ 500
		</div>

		<Restrictions {chat} />
	</div>
</div>
