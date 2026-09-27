<script lang="ts">
	import type { LinkNode } from "$lib/models/message/parse";
	import type { UserMessage } from "$lib/models/message/user-message.svelte";
	import { settings } from "$lib/settings";

	import Timestamp from "../Timestamp.svelte";
	import User from "../user/User.svelte";
	import Badges from "./Badges.svelte";
	import Content from "./Content.svelte";
	import Embed from "./Embed.svelte";
	import Gif from "./Gif.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
	}

	const { message, nested = false }: Props = $props();

	const linkNodes = $derived(message.nodes.filter((n) => n.type === "link"));

	// The message text of a GIF message is its alt text, which is shown instead
	// of the GIF itself when rendering them is disabled.
	const gif = $derived(settings.state["chat.gifs"] && !nested ? message.gif : null);

	function canEmbed(node: LinkNode) {
		return (
			node.data.tld.domain === "7tv.app" ||
			node.data.tld.hostname === "open.spotify.com" ||
			node.data.tld.hostname === "clips.twitch.tv" ||
			(node.data.tld.domain === "twitch.tv" && node.data.url.pathname.includes("/clip/"))
		);
	}
</script>

<Timestamp date={message.timestamp} />
<Badges badges={message.badges} />
<User {message} {nested} />

{#if gif}
	<Gif {gif} alt={message.text} />
{:else}
	<Content {message} {nested} />
{/if}

{#if settings.state["chat.embeds"] && !nested && linkNodes.some(canEmbed)}
	<div class="mt-2 flex flex-wrap gap-2">
		{#each linkNodes.filter(canEmbed) as node}
			<Embed {...node.data} />
		{/each}
	</div>
{/if}
