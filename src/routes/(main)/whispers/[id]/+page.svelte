<script lang="ts">
	import { untrack } from "svelte";
	import type { KeyboardEventHandler } from "svelte/elements";

	import ChatSeparator from "#lib/components/chat/ChatSeparator.svelte";
	import ReverseScroll from "#lib/components/ReverseScroll.svelte";
	import Timestamp from "#lib/components/Timestamp.svelte";
	import Input from "#lib/components/ui/Input.svelte";
	import { log } from "#lib/log.js";

	const { data } = $props();

	$effect(() => {
		const { whisper } = data;

		untrack(() => {
			void whisper.markRead().catch((error) => {
				void log.error(`Failed to mark whisper as read: ${String(error)}`).catch(() => {});
			});
		});
	});

	const send: KeyboardEventHandler<HTMLInputElement> = async (event) => {
		if (event.key !== "Enter") return;

		const input = event.currentTarget;
		const value = input.value.trim();
		input.value = "";

		await data.whisper.send(value);
	};
</script>

<div class="flex h-full flex-col">
	<div class="min-h-0 grow">
		<!-- Start each thread scrolled to the end. -->
		{#key data.whisper}
			<ReverseScroll
				class="text-sm"
				data={data.whisper.messages}
				getKey={(message) => message.id}
				lazy={data.whisper.hasOlder}
				onloadmore={() => data.whisper.loadOlder()}
			>
				{#snippet children(message, i)}
					{@const prev = data.whisper.messages[i - 1]}
					{@const isNewDay =
						!prev || prev.createdAt.toDateString() !== message.createdAt.toDateString()}

					{#if isNewDay}
						<ChatSeparator class="my-3">
							<time datetime={message.createdAt.toISOString()}>
								{message.createdAt.toLocaleDateString(navigator.languages, {
									dateStyle: "long",
								})}
							</time>
						</ChatSeparator>
					{/if}

					<div
						class={[
							"flex items-start gap-2.5 px-5 py-3 transition-colors hover:bg-muted/50",
							!isNewDay && "border-t",
						]}
					>
						<img
							class="rounded-full ring-1 ring-black/10 dark:ring-white/10"
							src={message.user.avatarUrl}
							alt={message.user.displayName}
							width="40"
							height="40"
						/>

						<div class="flex w-full flex-col">
							<div class="flex w-full items-center justify-between gap-2">
								<span class="font-semibold" style={message.user.style}>
									{message.user.displayName}
								</span>

								<Timestamp date={message.createdAt} />
							</div>

							<p>{message.text}</p>
						</div>
					</div>
				{/snippet}
			</ReverseScroll>
		{/key}
	</div>

	<div class="p-2">
		<Input
			class="h-12"
			autocapitalize="off"
			autocorrect="off"
			placeholder="Send a message"
			onkeydown={send}
		/>
	</div>
</div>
