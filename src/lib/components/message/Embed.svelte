<script lang="ts">
	import dayjs from "dayjs";
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

<div class="group w-full max-w-100">
	{#if tld.domain === "7tv.app"}
		{#await fetchEmote() then emote}
			{#if emote}
				<div class="relative flex h-18 gap-2 overflow-hidden rounded-md border bg-card">
					<a
						class="absolute inset-0 z-10"
						href={url.href}
						target="_blank"
						aria-label={emote.name}
					></a>

					<div class="relative h-full shrink-0">
						<img
							class="h-full w-auto p-1.5"
							srcset={emote.srcset.join(", ")}
							alt={emote.name}
							decoding="async"
						/>

						{#if !emote.listed && blurred}
							<button
								class="absolute inset-0 backdrop-blur-lg"
								aria-label="Click to view"
								onclick={() => (blurred = false)}
							>
								<EyeSlash class="mt-1 size-5" />
							</button>
						{/if}
					</div>

					<div class="flex flex-col overflow-hidden py-1 pr-1">
						<div class="flex items-center">
							<span class="truncate" title={emote.name}>
								{emote.name}
							</span>

							{#if !emote.listed}
								<span class="ml-1 text-xs text-red-400">(unlisted)</span>
							{/if}
						</div>

						<span class="text-xs text-muted-foreground">
							by {emote.owner?.mainConnection?.platformDisplayName ?? "Unknown"}
						</span>
					</div>
				</div>
			{/if}
		{/await}
	{:else if tld.hostname === "open.spotify.com"}
		<div class="overflow-hidden rounded-xl">
			<iframe
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
				<div
					class="relative flex h-20 gap-2 overflow-hidden rounded-md border bg-card transition-colors"
				>
					<a
						class="absolute inset-0 z-10"
						href={clip.url}
						target="_blank"
						aria-label={clip.title}
					></a>

					<div class="relative">
						<img
							class="h-full"
							src={clip.thumbnailURL}
							alt={clip.title}
							decoding="async"
						/>

						<div
							class="absolute right-2 bottom-1 rounded bg-black/70 px-1 py-0.5 text-[10px] font-medium text-white"
						>
							{formatDuration(clip.durationSeconds)}
						</div>
					</div>

					<div class="flex flex-col gap-0.5 overflow-hidden py-1 pr-1">
						{clip.title}

						<span class="text-xs text-muted-foreground">
							{dayjs(clip.createdAt).format("MMMM D, YYYY")}
						</span>

						<div class="flex items-center gap-1 text-xs text-muted-foreground">
							by {clip.curator?.displayName}

							<span class="text-foreground">&bullet;</span>

							<div class="flex items-center">
								<Eye class="mr-1" />
								{clip.viewCount} views
							</div>
						</div>
					</div>
				</div>
			{/if}
		{/await}
	{/if}
</div>
