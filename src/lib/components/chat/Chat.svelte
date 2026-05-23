<script lang="ts">
	import { VList } from "virtua/svelte";
	import { Chat } from "$lib/models/chat.svelte";
	import type { Message } from "$lib/models/message/message";
	import { settings } from "$lib/settings";
	import AutoMod from "../message/AutoMod.svelte";
	import Notification from "../message/Notification.svelte";
	import SystemMessage from "../message/SystemMessage.svelte";
	import UserMessage from "../message/UserMessage.svelte";
	import Separator from "./Separator.svelte";

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

	const newMessageCount = $derived.by(() => {
		if (!list) return "0";

		const total = chat.messages.length - countSnapshot;
		return total > 99 ? "99+" : Math.max(total, 0).toString();
	});

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
	class="group/chat relative h-full"
	data-scrollbar={!settings.state["chat.hideScrollbar"]}
	{@attach (element) => {
		observer.observe(element);

		return () => observer.disconnect();
	}}
>
	{#if scrollingPaused}
		<button
			class="absolute bottom-0 z-10 flex w-full items-center justify-center rounded-t-md border bg-twitch/40 px-2 py-1 text-xs font-medium backdrop-blur-lg"
			type="button"
			onclick={scrollToEnd}
		>
			Scrolling paused

			{#if newMessageCount !== "0"}
				({newMessageCount} new messages)
			{/if}
		</button>
	{/if}

	<VList
		class="{className} overflow-y-auto text-sm group-data-[scrollbar=false]/chat:[&::-webkit-scrollbar]:hidden"
		data={chat.messages}
		getKey={(message) => message.id}
		onscroll={handleScroll}
		bind:this={list}
	>
		{#snippet children(message, i)}
			{#if message.isSystem() || message.isUser()}
				{@const prev = chat.messages[i - 1]}
				{@const isNewDay = prev && prev.timestamp.getDate() !== message.timestamp.getDate()}

				{#if isNewDay}
					<Separator>
						<time
							class="text-muted-foreground/90"
							datetime={message.timestamp.toISOString()}
						>
							{message.timestamp.toLocaleDateString(navigator.languages, {
								dateStyle: "long",
							})}
						</time>
					</Separator>
				{/if}

				{#if message.isSystem()}
					<SystemMessage {message} context={message.context} />
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

				{#if message === lastRead && next && settings.state["chat.newSeparator"]}
					<Separator class="text-red-400">New messages</Separator>
				{/if}

				{/* @ts-ignore */ null}
				{#if message.recent && !next?.recent && settings.state["chat.messages.history.separator"]}
					<Separator class="text-red-400">Live messages</Separator>
				{/if}
			{:else if message.isComponent()}
				<message.component {...message.props} />
			{/if}
		{/snippet}
	</VList>
</div>
