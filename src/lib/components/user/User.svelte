<script lang="ts">
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

	const id = $props.id();

	let opened = $state(false);

	const user = $derived(mention ?? message.author);
	const popoverId = $derived(`user-card-${user.id}-${id}`);
</script>

{#if mention}
	<button
		class="font-semibold wrap-break-word disabled:cursor-default"
		popovertarget={popoverId}
		disabled={nested}
		style={mention.mentionStyle}
		onpointerdown={() => (opened = true)}
		onfocus={() => (opened = true)}
	>
		@{mention.displayName}
	</button>
{:else}
	<button
		class="font-semibold wrap-break-word disabled:cursor-default"
		popovertarget={popoverId}
		disabled={nested}
		style={message.author.style}
		onpointerdown={() => (opened = true)}
		onfocus={() => (opened = true)}
	>
		{message.author.displayName}
	</button>{#if !message.action}:{/if}
{/if}

{#if !nested && opened}
	<UserCard id={popoverId} {user} channel={message.channel} onclose={() => (opened = false)} />
{/if}
