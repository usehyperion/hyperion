<script lang="ts">
	import dayjs from "dayjs";
	import relativeTime from "dayjs/plugin/relativeTime";
	import type { Attachment } from "svelte/attachments";

	import { resolve } from "$app/paths";

	import ChatDots from "~icons/ph/chat-dots";

	import { app } from "#lib/app.svelte.js";
	import * as Empty from "#lib/components/ui/empty/index.js";

	dayjs.extend(relativeTime);

	const { data } = $props();

	const whispers = $derived(
		[...data.whispers]
			.filter(([, whisper]) => whisper.latest)
			.toSorted(
				([, a], [, b]) =>
					(b.latest?.createdAt.getTime() ?? 0) - (a.latest?.createdAt.getTime() ?? 0),
			),
	);

	const unread = $derived(whispers.reduce((total, [, whisper]) => total + whisper.unread, 0));

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

<div class="h-full overflow-y-auto" data-component="whispers-page">
	{#if whispers.length}
		<div class="mx-auto w-full max-w-3xl pb-6">
			<header class="flex items-baseline gap-2 p-4" data-slot="whispers-page-header">
				<h1 class="text-lg font-semibold" data-slot="whispers-page-title">Whispers</h1>

				{#if unread}
					<span
						class="text-sm text-muted-foreground tabular-nums"
						data-slot="whispers-page-unread"
					>
						{unread} unread
					</span>
				{/if}
			</header>

			<ul class="divide-y border-y" data-slot="whispers-page-list">
				{#each whispers as [id, whisper] (id)}
					{@const message = whisper.latest!}
					{@const sender = whisper.sender}

					<li data-slot="whispers-page-item" data-unread={whisper.unread ? true : null}>
						<a
							class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2"
							data-slot="whispers-page-item-link"
							href={resolve("/(main)/whispers/[id]", { id })}
						>
							{#if sender.avatarUrl}
								<img
									class="size-10 shrink-0 rounded-full bg-muted object-cover ring-1 ring-black/10 dark:ring-white/10"
									data-slot="whispers-page-item-avatar"
									src={sender.avatarUrl}
									alt=""
									width="40"
									height="40"
								/>
							{:else}
								<div
									class="size-10 shrink-0 rounded-full bg-muted"
									data-slot="whispers-page-item-avatar"
								></div>
							{/if}

							<div class="flex min-w-0 flex-1 flex-col gap-0.5">
								<div class="flex items-baseline gap-3">
									<span
										class="truncate font-semibold"
										style={sender.style}
										data-slot="whispers-page-item-name"
									>
										{sender.displayName}
									</span>

									<time
										class={[
											"ml-auto shrink-0 text-xs tabular-nums",
											whisper.unread
												? "text-foreground"
												: "text-muted-foreground",
										]}
										data-slot="whispers-page-item-time"
										datetime={message.createdAt.toISOString()}
										{@attach relative(message.createdAt)}
									>
										{dayjs(message.createdAt).fromNow()}
									</time>
								</div>

								<div class="flex items-center gap-3">
									<p
										class={[
											"truncate text-sm",
											whisper.unread
												? "font-medium text-foreground"
												: "text-muted-foreground",
										]}
										data-slot="whispers-page-item-preview"
									>
										{#if message.user.id === app.user?.id}
											<span
												class="font-normal text-muted-foreground"
												data-slot="whispers-page-item-sender-prefix"
											>
												You:
											</span>
										{/if}

										{message.text}
									</p>

									{#if whisper.unread}
										<span
											class="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-400 px-1.5 text-[0.6875rem] font-semibold tabular-nums"
											data-slot="whispers-page-item-badge"
										>
											{whisper.unread > 9 ? "9+" : whisper.unread}
											<span class="sr-only">unread</span>
										</span>
									{/if}
								</div>
							</div>
						</a>
					</li>
				{/each}
			</ul>
		</div>
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
	{/if}
</div>
