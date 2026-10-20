<script lang="ts">
	import type { Message } from "#lib/models/message/message.js";

	import { Chat } from "#lib/models/chat.svelte.js";
	import { settings } from "#lib/settings/index.js";

	import AutoMod from "../message/AutoMod.svelte";
	import Event from "../message/Event.svelte";
	import Notification from "../message/Notification.svelte";
	import UserMessage from "../message/UserMessage.svelte";
	import ReverseScroll from "../ReverseScroll.svelte";
	import ChatSeparator from "./ChatSeparator.svelte";

	interface Props {
		class?: string;
		chat: Chat;
	}

	const { class: className, chat }: Props = $props();

	let lastRead = $state<Message | null>(null);
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

<ReverseScroll class="{className} text-sm" data={chat.messages} getKey={(message) => message.id}>
	{#snippet children(message, i)}
		{#if message.isEvent() || message.isUser()}
			{@const prev = chat.messages[i - 1]}
			{@const isNewDay = prev && prev.timestamp.getDate() !== message.timestamp.getDate()}

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
			{@const nextRecent = next && (next.isEvent() || next.isUser()) && next.recent}

			{#if message === lastRead && next && settings.state["chat.newSeparator"]}
				<ChatSeparator class="text-twitch-400">New messages</ChatSeparator>
			{/if}

			{#if message.recent && !nextRecent && settings.state["chat.messages.history.separator"]}
				<ChatSeparator class="text-red-400">Live messages</ChatSeparator>
			{/if}
		{:else if message.isComponent()}
			<message.component {...message.props} />
		{/if}
	{/snippet}
</ReverseScroll>
