<script lang="ts">
	import type { LinkNode } from "$lib/models/message/parse";
	import type { UserMessage } from "$lib/models/message/user-message";
	import { settings } from "$lib/settings";
	import Emote from "../Emote.svelte";
	import Timestamp from "../Timestamp.svelte";
	import * as Tooltip from "../ui/tooltip";
	import User from "../User.svelte";
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

{#each message.badges as badge (badge.id)}
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<img
					{...props}
					class={["inline-block align-middle", badge.color && "rounded-xs"]}
					src={badge.imageUrl}
					alt={badge.description}
					width="18"
					height="18"
					style:background-color={badge.color}
				/>
			{/snippet}
		</Tooltip.Trigger>

		<Tooltip.Content class="p-1 text-xs" side="top" sideOffset={4}>
			{badge.title}
		</Tooltip.Content>
	</Tooltip.Root>
{/each}

<User {message} {nested} />

<p
	class={["inline", message.action && "italic"]}
	style:color={message.action ? message.author.color : null}
>
	{#each message.nodes as node, i}
		{#if node.type === "link"}
			{#if node.marked}
				<mark class="wrap-anywhere">{node.value}</mark>
			{:else}
				<a href={node.data.url.toString()} target="_blank">{node.value}</a>
			{/if}
		{:else if node.type === "mention"}
			{#if !message.reply || (message.reply && i > 0)}
				{#if node.marked}
					<mark class="font-semibold wrap-break-word">
						@{node.data.user?.displayName ?? node.value.slice(1)}
					</mark>
				{:else if !node.data.user}
					<span class="font-semibold wrap-break-word">
						{node.value}
					</span>
				{:else}
					<User {message} mention={node} />
				{/if}
			{/if}
		{:else if node.type === "cheer"}
			{#if node.marked}
				<mark class="wrap-anywhere">{node.data.prefix + node.data.bits}</mark>
			{:else}
				{@const srcset = node.data.tier.images.flatMap((img) =>
					img ? [`${img.url} ${img.dpiScale}x`] : [],
				)}

				<img
					class="-my-2 inline-block align-middle"
					srcset={srcset.join(", ")}
					alt="{node.data.prefix} {node.data.bits}"
				/>

				<span class="font-semibold" style:color={node.data.tier.color}
					>{node.data.bits}</span
				>
			{/if}
		{:else if node.type === "emote"}
			{#if node.marked}
				<mark class="wrap-anywhere">{node.data.emote.name}</mark>
			{:else}
				<Emote emote={node.data.emote} layers={node.data.layers} />
			{/if}
		{:else}
			<svelte:element this={node.marked ? "mark" : "span"} class="wrap-anywhere">
				{node.value}
			</svelte:element>
		{/if}
	{/each}
</p>

{#if settings.state["chat.embeds"] && !nested && linkNodes.some(canEmbed)}
	<div class="mt-2 flex gap-2">
		{#each linkNodes as node}
			<Embed {...node.data} />
		{/each}
	</div>
{/if}

<style>
	mark {
		color: white;
		background-color: --alpha(var(--color-red-500) / 40%);
	}
</style>
