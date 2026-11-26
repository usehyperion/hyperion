<script lang="ts">
	import { createPopoverController, PopoverTrigger } from "@ui-sdk/svelte/popover";

	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import UserCard from "./UserCard.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;

		/**
		 * A user mentioned in the message to render instead of its author.
		 */
		mention?: User;
	}

	const { message, nested = false, mention }: Props = $props();

	const controller = createPopoverController();

	let card = $state<UserCard>();

	const user = $derived(mention ?? message.author);
	const defaultProps = $derived({
		class: "font-semibold wrap-break-word disabled:cursor-default",
		controller,
		disabled: nested,
		onclick,
	});

	function onclick(event: MouseEvent) {
		if (!event.shiftKey || !card) return;

		event.preventDefault();
		card.popOut(user, message.channel);
	}
</script>

{#if mention}
	<PopoverTrigger
		style={mention.mentionStyle}
		{...defaultProps}
		class="mention {defaultProps.class}"
	>
		@{mention.displayName}
	</PopoverTrigger>
{:else}
	<PopoverTrigger
		style={message.author.style}
		{...defaultProps}
		class="username {defaultProps.class}"
	>
		{message.author.displayName}
	</PopoverTrigger>{#if !message.action}:{/if}
{/if}

{#if !nested}
	<UserCard {controller} {user} channel={message.channel} bind:this={card} />
{/if}
