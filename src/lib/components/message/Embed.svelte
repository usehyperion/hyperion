<script lang="ts" module>
	import type { LinkNode } from "#lib/models/message/parse.js";

	export type EmbedTarget =
		| { type: "emote"; id: string }
		| { type: "spotify"; path: string }
		| { type: "clip"; slug: string };

	/**
	 * Returns what a link embeds, or `null` if it can't be embedded.
	 */
	export function embedOf({ url, tld }: LinkNode["data"]): EmbedTarget | null {
		const parts = url.pathname.split("/");

		if (tld.domain === "7tv.app" && parts[1] === "emotes" && parts[2]) {
			return { type: "emote", id: parts[2] };
		}

		if (tld.hostname === "open.spotify.com") {
			return { type: "spotify", path: url.pathname.replace(/\/intl-\w+\//, "/") };
		}

		if (tld.hostname === "clips.twitch.tv" && parts[1]) {
			return { type: "clip", slug: parts[1] };
		}

		// twitch.tv/<channel>/clip/<slug>
		if (tld.domain === "twitch.tv" && parts[2] === "clip" && parts[3]) {
			return { type: "clip", slug: parts[3] };
		}

		return null;
	}
</script>

<script lang="ts">
	import type { Snippet } from "svelte";

	import Eye from "~icons/ph/eye";
	import EyeSlash from "~icons/ph/eye-slash";

	import { app } from "#lib/app.svelte.js";
	import dayjs from "#lib/dayjs.js";
	import { transformGql7tvEmote } from "#lib/emotes.js";
	import { emoteQuery, execute7tvQuery } from "#lib/graphql/7tv.js";
	import { clipQuery } from "#lib/graphql/twitch.js";
	import { log } from "#lib/log.js";

	interface Props {
		url: URL;
		target: EmbedTarget;
	}

	const { url, target }: Props = $props();

	let blurred = $state(true);

	async function fetchEmote(id: string) {
		try {
			const { emotes } = await execute7tvQuery(emoteQuery, { id });
			if (!emotes.emote) return null;

			return {
				...transformGql7tvEmote(emotes.emote),
				listed: emotes.emote.flags.publicListed,
				owner: emotes.emote.owner,
			};
		} catch (error) {
			log.warn(`Failed to fetch 7TV emote embed: ${String(error)}`);
			return null;
		}
	}

	async function fetchClip(slug: string) {
		try {
			const { clip } = await app.twitch.gql(clipQuery, { slug });
			return clip;
		} catch (error) {
			log.warn(`Failed to fetch clip embed: ${String(error)}`);
			return null;
		}
	}

	function formatClipLength(seconds: number) {
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

{#if target.type === "emote"}
	{#await fetchEmote(target.id) then emote}
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
{:else if target.type === "spotify"}
	<div class="w-full max-w-100 overflow-hidden rounded-lg border bg-card">
		<iframe
			class="block"
			title="Spotify Web Player"
			src="https://open.spotify.com/embed{target.path}"
			width="100%"
			height="80"
			allow="clipboard-write"
			sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
		></iframe>
	</div>
{:else}
	{#await fetchClip(target.slug) then clip}
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
					{formatClipLength(clip.durationSeconds)}
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
