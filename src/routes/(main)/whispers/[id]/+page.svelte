<script lang="ts">
	import { onMount, tick, untrack } from "svelte";
	import type { KeyboardEventHandler } from "svelte/elements";

	import Timestamp from "$lib/components/Timestamp.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import { log } from "$lib/log";

	const { data } = $props();

	let chat = $state<HTMLDivElement>();
	let loadingOlder = false;

	onMount(() => {
		chat?.scrollTo(0, chat?.scrollHeight);
	});

	$effect(() => {
		const { whisper } = data;

		untrack(() => {
			void whisper.markRead().catch((error) => {
				void log.error(`Failed to mark whisper as read: ${String(error)}`).catch(() => {});
			});
		});
	});

	async function onscroll() {
		if (!chat || loadingOlder || !data.whisper.hasOlder || chat.scrollTop > 200) return;

		loadingOlder = true;

		try {
			const height = chat.scrollHeight;

			await data.whisper.loadOlder();
			await tick();

			// Keep the current messages in place as older ones are prepended.
			chat.scrollTop += chat.scrollHeight - height;
		} finally {
			loadingOlder = false;
		}
	}

	$effect.pre(() => {
		if (!chat) return;

		void data.whisper.messages.length;

		if (chat.offsetHeight + chat.scrollTop > chat.scrollHeight - 20) {
			tick().then(() => {
				chat?.scrollTo(0, chat?.scrollHeight);
			});
		}
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
	<div class="grow divide-y divide-border overflow-y-auto text-sm" {onscroll} bind:this={chat}>
		{#each data.whisper.messages as message (message.id)}
			<div class="flex items-start gap-2.5 px-5 py-3 transition-colors hover:bg-muted/50">
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
		{/each}
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
