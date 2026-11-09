<script lang="ts">
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { settings } from "#lib/settings/index.js";

	import Timestamp from "../Timestamp.svelte";
	import User from "../user/User.svelte";
	import Badges from "./Badges.svelte";
	import Content from "./Content.svelte";
	import Embed, { embedOf } from "./Embed.svelte";
	import Gif from "./Gif.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
	}

	const { message, nested = false }: Props = $props();

	// The message text of a GIF message is its alt text, which is shown instead
	// of the GIF itself when rendering them is disabled.
	const gif = $derived(settings.state["chat.gifs"] && !nested ? message.gif : null);

	const embeds = $derived.by(() => {
		if (!settings.state["chat.embeds"] || nested) return [];

		return message.nodes.flatMap((node) => {
			if (node.type !== "link") return [];

			const target = embedOf(node.data);
			return target ? [{ url: node.data.url, target }] : [];
		});
	});
</script>

<Timestamp date={message.timestamp} />
<Badges badges={message.badges} />
<User {message} {nested} />

{#if gif}
	<Gif {gif} alt={message.text} />
{:else}
	<Content {message} {nested} />
{/if}

{#if embeds.length}
	<div class="mt-2 flex flex-wrap gap-2">
		{#each embeds as embed}
			<Embed {...embed} />
		{/each}
	</div>
{/if}
