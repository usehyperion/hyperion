<script lang="ts">
	import type { Stream } from "#lib/models/stream.svelte.js";

	import { IconCategory, IconStreamInfo } from "#lib/icons.js";

	import Button from "../ui/Button.svelte";
	import Popover from "../ui/Popover.svelte";

	interface Props {
		stream: Stream;
		anchor?: HTMLElement | null;
	}

	const { stream, anchor }: Props = $props();
</script>

<Popover
	class="w-[calc(var(--anchor-width)-1rem)]"
	{anchor}
	side="bottom"
	align="center"
	sideOffset={4}
	aria-label="Stream info"
>
	{#snippet trigger(props)}
		<Button
			{...props}
			class="size-8 rounded-none text-fg-muted hover:text-fg"
			size="icon-sm"
			variant="ghost"
			aria-label="Stream info"
		>
			<IconStreamInfo class="size-3.5" />
		</Button>
	{/snippet}

	<div class="@container">
		<div class="flex flex-col gap-2 @md:flex-row @md:items-start">
			{#if stream.thumbnailUrl}
				<img
					class="aspect-video w-full shrink-0 rounded-control border border-line bg-surface-2 object-cover @md:w-56"
					src={stream.thumbnailUrl}
					alt="Stream thumbnail"
					width="640"
					height="360"
					loading="lazy"
					decoding="async"
					draggable="false"
				/>
			{/if}

			<div class="min-w-0 space-y-2">
				<p class="text-sm font-medium wrap-break-word">{stream.title}</p>

				<div class="flex items-center gap-1 text-xs text-accent">
					<IconCategory class="shrink-0" />

					{#if stream.game.slug}
						<a
							class="truncate hover:underline"
							title={stream.game.name}
							href="https://www.twitch.tv/directory/category/{stream.game.slug}"
							target="_blank"
							rel="noopener noreferrer"
							data-bare
						>
							{stream.game.name}
						</a>
					{:else}
						<span class="truncate">{stream.game.name}</span>
					{/if}
				</div>

				{@render tags()}
			</div>
		</div>
	</div>
</Popover>

{#snippet tags()}
	{#if stream.tags.length}
		<ul class="flex flex-wrap gap-1">
			{#each stream.tags as tag}
				<li>
					<a
						class="block rounded-full bg-surface-2 px-2 py-0.5 text-[0.625rem] text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg"
						href="https://www.twitch.tv/directory/all/tags/{tag}"
						target="_blank"
						rel="noopener noreferrer"
						data-bare
					>
						{tag}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
{/snippet}
