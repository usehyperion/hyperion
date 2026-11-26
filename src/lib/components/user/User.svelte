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

	const card = createPopoverController();

	const user = $derived(mention ?? message.author);
</script>

{#if mention}
	<PopoverTrigger
		class="font-semibold wrap-break-word disabled:cursor-default"
		controller={card}
		disabled={nested}
		style={mention.mentionStyle}
	>
		@{mention.displayName}
	</PopoverTrigger>
{:else}
	<PopoverTrigger
		class="font-semibold wrap-break-word disabled:cursor-default"
		controller={card}
		disabled={nested}
		style={message.author.style}
	>
		{message.author.displayName}
	</PopoverTrigger>{#if !message.action}:{/if}
{/if}

{#if !nested}
	<UserCard controller={card} {user} channel={message.channel} />
{/if}
