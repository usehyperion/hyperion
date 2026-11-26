<script lang="ts">
	import { untrack } from "svelte";

	import type { Chat } from "#lib/models/chat.svelte.js";
	import type { Message } from "#lib/models/message/message.svelte.js";

	import { settings } from "#lib/settings.js";

	import AutoMod from "../message/AutoMod.svelte";
	import Event from "../message/Event.svelte";
	import Notification from "../message/Notification.svelte";
	import UserMessage from "../message/UserMessage.svelte";
	import ReverseScroll from "../ReverseScroll.svelte";
	import ChatSeparator from "./ChatSeparator.svelte";

	interface Props {
		chat: Chat;
	}

	const { chat }: Props = $props();

	let lastRead = $state<Message | null>(null);
	let scroller = $state<ReturnType<typeof ReverseScroll>>();

	$effect(() => {
		const target = chat.jumpTarget;
		if (!target) return;

		untrack(() => {
			const index = chat.messages.findIndex((message) => message.id === target.id);

			if (index !== -1) {
				scroller?.scrollToIndex(index);
			}
		});
	});
</script>

<svelte:window
	onblur={() => {
		lastRead = chat.messages.at(-1) ?? null;
	}}
	onfocus={() => {
		if (lastRead === chat.messages.at(-1)) {
			lastRead = null;
		}
	}}
/>

<ReverseScroll
	class="text-body"
	data={chat.messages}
	getKey={(message) => message.id}
	bind:this={scroller}
>
	{#snippet children(message, i)}
		{@const prev = chat.messages[i - 1]}
		{@const isNewDay =
			prev && prev.timestamp.toDateString() !== message.timestamp.toDateString()}

		{#if isNewDay}
			<ChatSeparator>
				<time datetime={message.timestamp.toISOString()}>
					{message.timestamp.toLocaleDateString(navigator.languages, {
						dateStyle: "long",
					})}
				</time>
			</ChatSeparator>
		{/if}

		{#if message.isEvent()}
			<Event {message} />
		{:else if message.isUser()}
			{#if message.event}
				<Notification {message} />
			{:else if message.autoMod}
				<AutoMod {message} metadata={message.autoMod} />
			{:else}
				<UserMessage {message} />
			{/if}
		{/if}

		{@const next = chat.messages.at(i + 1)}
		{@const nextRecent = next?.recent}

		{#if message === lastRead && next && settings.state["chat.newSeparator"]}
			<ChatSeparator class="text-accent">New messages</ChatSeparator>
		{/if}

		{#if message.recent && !nextRecent && settings.state["chat.messages.history.separator"]}
			<ChatSeparator class="text-live">Live messages</ChatSeparator>
		{/if}
	{/snippet}
</ReverseScroll>
