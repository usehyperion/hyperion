<script lang="ts">
	import dayjs from "dayjs";
	import relativeTime from "dayjs/plugin/relativeTime";
	import type { Attachment } from "svelte/attachments";
	import { resolve } from "$app/paths";
	import * as Empty from "$lib/components/ui/empty";
	import ChatDots from "~icons/ph/chat-dots";

	dayjs.extend(relativeTime);

	const { data } = $props();

	function relative(date: Date): Attachment {
		return (element) => {
			let interval: ReturnType<typeof setInterval> | undefined;

			const now = new Date();
			const offset = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

			const timeout = setTimeout(() => {
				element.textContent = dayjs(date).fromNow();

				interval = setInterval(() => {
					element.textContent = dayjs(date).fromNow();
				}, 60 * 1000);
			}, offset);

			return () => {
				clearTimeout(timeout);
				clearInterval(interval);
			};
		};
	}
</script>

{#each data.whispers as [id, whisper]}
	{@const message = whisper.latest}

	{#if message}
		<div
			class="relative flex items-center border-b py-4 pr-6 pl-5 transition-colors hover:bg-muted/80"
		>
			<a
				class="absolute inset-0 z-1"
				href={resolve("/(main)/whispers/[id]", { id })}
				aria-label="Go to whisper with {whisper.sender.displayName}"
				data-sveltekit-preload-data="off"
			></a>

			<img
				class="mr-3 rounded-full"
				src={whisper.sender.avatarUrl}
				alt={whisper.sender.displayName}
				width="56"
				height="56"
			/>

			<div class="flex w-full flex-col">
				<div class="flex items-center justify-between">
					<span class="font-semibold" style={whisper.sender.style}>
						{whisper.sender.displayName}
					</span>

					<time
						class="text-sm text-muted-foreground"
						datetime={message.createdAt.toISOString()}
						{@attach relative(message.createdAt)}
					>
						{dayjs(message.createdAt).fromNow()}
					</time>
				</div>

				<div class="flex justify-between">
					<p class={["text-sm", !whisper.unread && "text-muted-foreground"]}>
						{message.text}
					</p>

					{#if whisper.unread}
						<div
							class="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-foreground"
						>
							{whisper.unread > 9 ? "9+" : whisper.unread}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{:else}
	<Empty.Root class="h-full">
		<Empty.Header>
			<Empty.Media variant="icon">
				<ChatDots />
			</Empty.Media>

			<Empty.Title>No whispers</Empty.Title>

			<Empty.Description>Any whispers you receive will appear here.</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{/each}
