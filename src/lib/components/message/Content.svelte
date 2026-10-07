<script lang="ts">
	import { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import Emote from "../Emote.svelte";
	import User from "../user/User.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
	}

	const { message, nested = false }: Props = $props();
</script>

<p
	class={["inline", message.action && "italic"]}
	data-component="message-content"
	style:color={message.action ? message.author.color : null}
>
	{#each message.nodes as node, i}
		{#if node.type === "link"}
			{#if node.marked}
				<mark class="wrap-anywhere" data-slot="message-content-link">{node.value}</mark>
			{:else}
				<a href={node.data.url.toString()} target="_blank" data-slot="message-content-link"
					>{node.value}</a
				>
			{/if}
		{:else if node.type === "mention"}
			{#if !message.reply || (message.reply && i > 0)}
				{#if node.marked}
					<mark class="font-semibold wrap-break-word" data-slot="message-content-mention">
						@{node.data.user?.displayName ?? node.value.slice(1)}
					</mark>
				{:else if !node.data.user}
					<span class="font-semibold wrap-break-word" data-slot="message-content-mention">
						{node.value}
					</span>
				{:else}
					<User {message} mention={node} {nested} />
				{/if}
			{/if}
		{:else if node.type === "cheer"}
			{#if node.marked}
				<mark class="wrap-anywhere" data-slot="message-content-cheer"
					>{node.data.prefix + node.data.bits}</mark
				>
			{:else}
				{@const srcset = node.data.tier.images.flatMap((img) =>
					img ? [`${img.url} ${img.dpiScale}x`] : [],
				)}

				<img
					class="-my-2 inline-block align-middle"
					srcset={srcset.join(", ")}
					alt="{node.data.prefix} {node.data.bits}"
					width="28"
					height="28"
					data-slot="message-content-cheer"
				/>

				<span
					class="font-semibold"
					style:color={node.data.tier.color}
					data-slot="message-content-cheer-amount">{node.data.bits}</span
				>
			{/if}
		{:else if node.type === "emote"}
			{#if node.marked}
				<mark class="wrap-anywhere" data-slot="message-content-emote"
					>{node.data.emote.displayName}</mark
				>
			{:else}
				<Emote emote={node.data.emote} layers={node.data.layers} />
			{/if}
		{:else}
			<svelte:element
				this={node.marked ? "mark" : "span"}
				class="wrap-anywhere"
				data-slot="message-content-text"
			>
				{node.value}
			</svelte:element>
		{/if}
	{/each}
</p>

<style>
	mark {
		color: white;
		background-color: --alpha(var(--color-red-500) / 40%);
	}
</style>
