<script lang="ts">
	import type { MentionNode } from "#lib/models/message/parse.js";
	import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

	import { settings } from "#lib/settings/index.js";

	import UserCard from "./UserCard.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
		mention?: MentionNode;
	}

	const { message, nested = false, mention }: Props = $props();

	const id = $props.id();

	let opened = $state(false);

	const user = $derived(mention?.data.user ?? message.author);
	const popoverId = $derived(`user-card-${user.id}-${id}`);

	function getMentionStyle() {
		switch (settings.state["chat.usernames.mentionStyle"]) {
			case "none":
				return null;
			case "colored":
				return `color: ${mention?.data.user?.color}`;
			case "painted":
				return mention?.data.user?.style;
		}
	}
</script>

{#if mention}
	<button
		class="font-semibold wrap-break-word disabled:cursor-default"
		popovertarget={popoverId}
		disabled={nested}
		style={getMentionStyle()}
		onpointerdown={() => (opened = true)}
		onfocus={() => (opened = true)}
	>
		@{mention.data.user?.displayName ?? mention.value.slice(1)}
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
