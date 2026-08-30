<script lang="ts">
	import dayjs from "dayjs";
	import type { Snippet } from "svelte";

	import { app } from "$lib/app.svelte";
	import { transform7tvEmote } from "$lib/emotes";
	import { send7tv as send } from "$lib/graphql";
	import { emoteQuery } from "$lib/graphql/7tv";
	import { clipQuery } from "$lib/graphql/twitch";

	import Eye from "~icons/ph/eye";
	import EyeSlash from "~icons/ph/eye-slash";

	interface Props {
		url: URL;
		tld: ReturnType<typeof import("tldts").parse>;
	}

	const { url, tld }: Props = $props();

	let blurred = $state(true);

	async function fetchEmote() {
		const parts = url.pathname.split("/");
		if (parts[1] !== "emotes") return;

		const { emotes } = await send(emoteQuery, { id: parts[2] });
		if (!emotes.emote) return;

		return {
			...transform7tvEmote(emotes.emote),
			listed: emotes.emote.flags.publicListed,
			owner: emotes.emote.owner,
		};
	}

	async function fetchClip() {
		let slug = url.pathname.split("/")[3];

		if (tld.hostname === "clips.twitch.tv") {
			slug = url.pathname.slice(1);
		}

		const { clip } = await app.twitch.gql(clipQuery, { slug });
		return clip;
	}

	function formatDuration(seconds: number) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;

		return `${m}:${s.toString().padStart(2, "0")}`;
	}
</script>

{#snippet card(href: string, label: string, media: Snippet, body: Snippet)}
	<div
		class={[
			"group relative flex h-19 w-full max-w-100 gap-3 overflow-hidden rounded-lg border bg-card",
			"transition-[background-color,border-color] hover:border-ring/40 hover:bg-accent/40",
		]}
	>
		<a class="absolute inset-0 z-10 rounded-lg" {href} target="_blank" aria-label={label}></a>

		<div class="relative shrink-0">
			{@render media()}
		</div>

		<div class="flex min-w-0 flex-col justify-center gap-0.5 py-2 pr-3">
			{@render body()}
		</div>
	</div>
{/snippet}

{#snippet meta(children: Snippet)}
	<div class="flex items-center gap-1.5 text-xs text-muted-foreground">
		{@render children()}
	</div>
{/snippet}

{#if tld.domain === "7tv.app"}
	{#await fetchEmote() then emote}
		{#if emote}
			{#snippet emoteMedia()}
				<div class="flex h-full w-19 items-center justify-center bg-muted/40 p-1.5">
					<img
						class="max-h-full w-auto"
						srcset={emote.srcset.join(", ")}
						alt={emote.displayName}
						decoding="async"
					/>
				</div>

				{#if !emote.listed && blurred}
					<button
						class="absolute inset-0 z-20 grid place-items-center backdrop-blur-lg
							transition-colors hover:bg-background/20"
						aria-label="Click to reveal unlisted emote"
						onclick={() => (blurred = false)}
					>
						<EyeSlash class="size-5 text-muted-foreground" />
					</button>
				{/if}
			{/snippet}

			{#snippet emoteBody()}
				<div class="flex min-w-0 items-center gap-1.5">
					<span class="truncate font-medium" title={emote.displayName}>
						{emote.displayName}
					</span>

					{#if !emote.listed}
						<span
							class="shrink-0 rounded-sm bg-red-500/15 px-1 py-px text-[10px]
								font-medium tracking-wide text-red-400 uppercase"
						>
							unlisted
						</span>
					{/if}
				</div>

				{#snippet emoteMeta()}
					<span class="truncate">
						by {emote.owner?.mainConnection?.platformDisplayName ?? "Unknown"}
					</span>
				{/snippet}

				{@render meta(emoteMeta)}
			{/snippet}

			{@render card(url.href, emote.displayName, emoteMedia, emoteBody)}
		{/if}
	{/await}
{:else if tld.hostname === "open.spotify.com"}
	<div class="w-full max-w-100 overflow-hidden rounded-lg border bg-card">
		<iframe
			class="block"
			title="Spotify Web Player"
			src="https://open.spotify.com/embed{url.pathname.replace(/\/intl-\w+\//, '/')}"
			width="100%"
			height="80"
			allow="clipboard-write"
			sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
		></iframe>
	</div>
{:else if tld.domain === "twitch.tv"}
	{#await fetchClip() then clip}
		{#if clip}
			{#snippet clipMedia()}
				<img
					class="h-full w-auto object-cover"
					src={clip.thumbnailURL}
					alt={clip.title}
					decoding="async"
				/>

				<div
					class="absolute right-1.5 bottom-1.5 rounded bg-black/75 px-1 py-0.5
						text-[10px] font-medium text-white tabular-nums"
				>
					{formatDuration(clip.durationSeconds)}
				</div>
			{/snippet}

			{#snippet clipBody()}
				<span class="truncate font-medium" title={clip.title}>
					{clip.title}
				</span>

				{#snippet clipMeta()}
					<span class="truncate">by {clip.curator?.displayName}</span>

					<span class="text-border">&bullet;</span>

					<span class="flex shrink-0 items-center gap-1">
						<Eye />
						{clip.viewCount}
					</span>

					<span class="text-border">&bullet;</span>

					<span class="shrink-0">{dayjs(clip.createdAt).format("MMM D, YYYY")}</span>
				{/snippet}

				{@render meta(clipMeta)}
			{/snippet}

			{@render card(clip.url, clip.title, clipMedia, clipBody)}
		{/if}
	{/await}
{/if}
