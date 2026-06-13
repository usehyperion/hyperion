<script lang="ts">
	import type { LinkNode } from "$lib/models/message/parse";
	import type { UserMessage } from "$lib/models/message/user-message";
	import { settings } from "$lib/settings";
	import Timestamp from "../Timestamp.svelte";
	import User from "../User.svelte";
	import Badges from "./Badges.svelte";
	import Content from "./Content.svelte";
	import Embed from "./Embed.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
	}

	const { message, nested = false }: Props = $props();

	const linkNodes = $derived(message.nodes.filter((n) => n.type === "link"));

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
<Content {message} />

{#if settings.state["chat.embeds"] && !nested && linkNodes.some(canEmbed)}
	<div class="mt-2 flex gap-2">
		{#each linkNodes as node}
			<Embed {...node.data} />
		{/each}
	</div>
{/if}
