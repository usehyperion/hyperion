<script lang="ts">
	import { fly } from "svelte/transition";
	import { VList } from "virtua/svelte";
	import { Chat } from "$lib/models/chat.svelte";
	import type { Message } from "$lib/models/message/message";
	import { settings } from "$lib/settings";
	import ArrowDown from "~icons/ph/arrow-down";
	import AutoMod from "../message/AutoMod.svelte";
	import Event from "../message/Event.svelte";
	import Notification from "../message/Notification.svelte";
	import UserMessage from "../message/UserMessage.svelte";
	import ChatSeparator from "./ChatSeparator.svelte";

	interface Props {
		class?: string;
		chat: Chat;
	}

	// Arbitrary; corresponds to how much of the bottom of the chat needs to be
	// visible (smaller = more, larger = less).
	const TOLERANCE = 15;

	const { class: className, chat }: Props = $props();

	let list = $state<VList<Message>>();
	let scrollingPaused = $state(false);
	let countSnapshot = $state(0);
	let lastRead = $state<Message | null>(null);

	const observer = new ResizeObserver(() => {
		if (!scrollingPaused) scrollToEnd();
	});

	const newMessageCount = $derived(chat.messages.length - countSnapshot);
	const hasNew = $derived(newMessageCount > 0);

	$effect(() => {
		if (chat.messages.length && !scrollingPaused) {
			scrollToEnd();
		}
	});

	function scrollToEnd() {
		list?.scrollToIndex(chat.messages.length - 1, { align: "end" });
	}

	function handleScroll(offset: number) {
		if (!list) return;

		const atBottom = offset >= list.getScrollSize() - list.getViewportSize() - TOLERANCE;

		if (!atBottom && !scrollingPaused) {
			countSnapshot = chat.messages.length;
		}

		scrollingPaused = !atBottom;
	}
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

<div
	class="chat group/chat relative h-full"
	data-scrollbar={!settings.state["chat.hideScrollbar"]}
	{@attach (element) => {
		observer.observe(element);

		return () => observer.disconnect();
	}}
>
	{#if scrollingPaused}
		<div class="absolute inset-x-0 bottom-4 z-10 flex justify-center">
			<button
				class={[
					"flex items-center rounded-full border bg-twitch/40 p-1.5 text-xs font-medium shadow-sm backdrop-blur-lg transition-[background-color,padding] duration-200 ease-out hover:bg-twitch/60",
					hasNew && "pr-3",
				]}
				type="button"
				onclick={scrollToEnd}
				transition:fly={{ y: 16, duration: 200 }}
			>
				<ArrowDown class="size-4 shrink-0" />

				<span
					class="grid overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
					style:grid-template-columns={hasNew ? "minmax(0, 1fr)" : "minmax(0, 0fr)"}
				>
					<span class="overflow-hidden pl-1.5 whitespace-nowrap">
						{newMessageCount} new {newMessageCount === 1 ? "message" : "messages"}
					</span>
				</span>
			</button>
		</div>
	{/if}

	<VList
		class="{className} chat-viewport overflow-y-auto text-sm group-data-[scrollbar=false]/chat:[&::-webkit-scrollbar]:hidden"
		data={chat.messages}
		getKey={(message) => message.id}
		onscroll={handleScroll}
		bind:this={list}
	>
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
	</VList>
</div>

<style>
	@property --scroll-fade {
		syntax: "<length-percentage>";
		inherits: false;
		initial-value: 0;
	}

	.chat :global(.chat-viewport) {
		--scroll-fade: 0;

		mask-image: linear-gradient(
			to bottom,
			#000 0,
			#000 calc(100% - var(--scroll-fade)),
			transparent 100%
		);
		mask-composite: intersect;
		mask-repeat: no-repeat;
		animation: 1ms ease-in-out scroll-fade both;
		animation-timeline: scroll(self y);
		animation-range: calc(100% - calc(var(--spacing) * 24));
	}

	@keyframes scroll-fade {
		from {
			--scroll-fade: min(12%, calc(var(--spacing) * 10));
		}

		to {
			--scroll-fade: 0;
		}
	}
</style>
