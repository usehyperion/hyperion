<script lang="ts">
	import { onMount, tick } from "svelte";
	import type { KeyboardEventHandler } from "svelte/elements";
	import Timestamp from "$lib/components/Timestamp.svelte";
	import Input from "$lib/components/ui/Input.svelte";

	const { data } = $props();

	let chat = $state<HTMLDivElement>();

	onMount(() => {
		chat?.scrollTo(0, chat?.scrollHeight);
	});

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
	<div class="grow divide-y divide-border overflow-y-auto text-sm" bind:this={chat}>
		{#each data.whisper.messages as message (message.id)}
			<div class="flex items-start gap-2.5 px-5 py-3 transition-colors hover:bg-muted/50">
				<img
					class="rounded-full"
					src={message.user.avatarUrl}
					alt={message.user.displayName}
					width="40"
					height="40"
				/>

				<div class="flex flex-col">
					<div class="flex items-center gap-2">
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
