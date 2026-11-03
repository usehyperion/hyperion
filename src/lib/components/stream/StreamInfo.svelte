<script lang="ts">
	import GameController from "~icons/ph/game-controller";
	import Info from "~icons/ph/info";

	import type { Stream } from "#lib/models/stream.svelte.js";

	import Button from "../ui/Button.svelte";
	import Popover from "../ui/Popover.svelte";

	interface Props {
		stream: Stream;
		anchor?: HTMLElement | null;
	}

	const { stream, anchor }: Props = $props();

	const id = $derived(`stream-info-${stream.channelId}`);
</script>

<Button
	class="size-8 rounded-none text-muted-foreground hover:text-foreground"
	size="icon-sm"
	variant="ghost"
	popovertarget={id}
	aria-label="Stream info"
>
	<Info class="size-3.5" />
</Button>

<Popover
	{id}
	class={[
		"right-[anchor(right)] w-auto overflow-y-auto p-3 [--anchor-gap:0.5rem]",
		"origin-top -translate-y-2 open:translate-y-0 starting:open:-translate-y-2",
		"transition-[opacity,scale,translate,overlay,display] duration-200 ease-out-quart",
	]}
	{anchor}
	side="bottom"
	align="start"
>
	<div class="@container">
		<div class="flex flex-col gap-2 @md:flex-row @md:items-start">
			{#if stream.thumbnailUrl}
				<img
					class="aspect-video w-full shrink-0 rounded-lg bg-muted object-cover ring-1 ring-black/10 @md:w-56 dark:ring-white/10"
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

				<div class="flex items-center gap-1 text-xs text-twitch dark:text-twitch-link">
					<GameController class="shrink-0" />

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
						class="block rounded-full bg-muted px-2 py-0.5 text-[0.625rem] text-muted-foreground transition-colors hover:bg-orange-500 hover:text-foreground"
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
