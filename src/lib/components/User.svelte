<script lang="ts">
	import type { MentionNode } from "$lib/models/message/parse";
	import { UserMessage } from "$lib/models/message/user-message.svelte";
	import { settings } from "$lib/settings";
	import { openUserCard } from "$lib/windows";

	import Popover from "./ui/Popover.svelte";
	import UserCard from "./UserCard.svelte";

	interface Props {
		message: UserMessage;
		nested?: boolean;
		mention?: MentionNode;
	}

	const { message, nested = false, mention }: Props = $props();

	const id = $props.id();

	let opened = $state(false);
	let loading = $state(false);

	const user = $derived(mention?.data.user ?? message.author);
	const relationship = $derived(user.relationships.get(message.channel.user.username));
	const popoverId = $derived(`user-card-${user.id}-${id}`);

	async function fetchInfo() {
		try {
			loading = true;

			if (user.partial) {
				await user.fetch();
			}

			if (!relationship) {
				await user.fetchRelationship(message.channel.user.username);
			}
		} finally {
			loading = false;
		}
	}

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
	{@const history = message.channel.chat.messages.filter(
		(m): m is UserMessage => m.isUser() && m.author.id === user.id,
	)}

	<Popover
		id={popoverId}
		class="w-sm overflow-hidden p-0"
		onbeforetoggle={async (event) => {
			if (event.newState === "open") await fetchInfo();
		}}
	>
		<UserCard
			{user}
			channel={message.channel}
			{relationship}
			{history}
			{loading}
			onPopout={() => openUserCard(user, message.channel)}
		/>
	</Popover>
{/if}
