<script lang="ts">
	import { Avatar, Popover } from "bits-ui";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";
	import type { MentionNode } from "$lib/models/message/parse";
	import { UserMessage } from "$lib/models/message/user-message";
	import { User } from "$lib/models/user.svelte";
	import { settings } from "$lib/settings";
	import Cake from "~icons/ph/cake-fill";
	import Heart from "~icons/ph/heart-fill";
	import StarOutline from "~icons/ph/star";
	import Star from "~icons/ph/star-fill";
	import UserIcon from "~icons/ph/user-bold";
	import Message from "./message/Message.svelte";

	dayjs.extend(localizedFormat);

	interface Props {
		message: UserMessage;
		nested?: boolean;
		mention?: MentionNode;
	}

	const { message, nested = false, mention }: Props = $props();

	let loading = $state(false);
	let showAllBadges = $state(false);

	const user = $derived(mention?.data.user ?? message.author);
	const relationship = $derived(user.relationships.get(message.channel.user.username));

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

<Popover.Root
	onOpenChange={async (open) => {
		if (open) await fetchInfo();
	}}
>
	{#if mention}
		<Popover.Trigger
			class="font-semibold wrap-break-word disabled:cursor-default"
			disabled={nested}
			style={getMentionStyle()}
		>
			@{mention.data.user?.displayName ?? mention.value.slice(1)}
		</Popover.Trigger>
	{:else}
		<Popover.Trigger
			class="font-semibold wrap-break-word disabled:cursor-default"
			disabled={nested}
			style={message.author.style}
		>
			{message.author.displayName}
		</Popover.Trigger>{#if !message.action}:{/if}
	{/if}

	<Popover.Portal>
		<Popover.Content
			class="z-50 w-sm origin-(--bits-popover-content-transform-origin) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md outline-hidden slide-in-from-left-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
			sideOffset={8}
		>
			{@render card(user)}
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>

{#snippet card(user: User)}
	{@const history = message.channel.chat.messages.filter(
		(m): m is UserMessage => m.isUser() && m.author.id === user.id,
	)}

	<div class="h-18 bg-twitch" style:background-color={user.color}>
		{#if user.bannerUrl}
			<img
				class="size-full object-cover"
				src={user.bannerUrl}
				alt=""
				loading="lazy"
				decoding="async"
			/>
		{/if}
	</div>

	<div class="relative border-t p-4">
		<Avatar.Root class="-mt-14">
			<div
				class="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-popover bg-primary"
			>
				<Avatar.Image src={user.avatarUrl} alt={user.displayName} />

				<Avatar.Fallback>
					<UserIcon class="size-10 text-primary-foreground" />
				</Avatar.Fallback>
			</div>
		</Avatar.Root>

		<div class="absolute top-2 right-2 space-y-1 text-xs text-muted-foreground">
			<div class="flex items-center gap-1">
				<Cake class="mr-1 size-3" />

				{#if loading}
					Loading...
				{:else}
					<time datetime={user.createdAt.toISOString()}>
						{dayjs(user.createdAt).format("LL")}
					</time>
				{/if}
			</div>

			<div class="flex items-center gap-1">
				<Heart class="mr-1 size-3" />

				{#if loading}
					Loading...
				{:else if relationship?.followedAt}
					<time datetime={relationship.followedAt.toISOString()}>
						{dayjs(relationship.followedAt).format("LL")}
					</time>
				{:else}
					Not following
				{/if}
			</div>

			<div class="flex items-center gap-1">
				{#if relationship?.subscription.hidden || !relationship?.subscription.tier}
					<StarOutline class="mr-1 size-3" />
				{:else}
					<Star class="mr-1 size-3" />
				{/if}

				{#if loading}
					Loading...
				{:else if !relationship?.subscription.hidden && relationship?.subscription.months}
					{@const { tier, type, months } = relationship.subscription}
					{@const noun = `month${months > 1 ? "s" : ""}`}

					{#if tier}
						{type === "prime" ? "Prime" : `Tier ${tier}`} - {months}
						{noun}
					{:else}
						{months} {noun}
					{/if}
				{:else}
					Subscription hidden
				{/if}
			</div>
		</div>

		<div class="mt-1 flex flex-col gap-y-2">
			<span class="font-semibold" style={user.style}>{user.displayName}</span>

			{#if relationship?.badges.length}
				{@const badges = showAllBadges
					? relationship.badges
					: relationship.badges.slice(0, 10)}

				<div class="flex flex-wrap items-center gap-1">
					{#each badges as badge (badge.id)}
						<img
							class="size-4"
							title={badge.title}
							src={badge.imageUrl}
							alt={badge.description}
						/>
					{/each}

					{#if !showAllBadges && relationship.badges.length > 10}
						<button
							class="ml-1 text-xs text-twitch transition-colors hover:text-twitch-link"
							type="button"
							onclick={() => (showAllBadges = true)}
							aria-label="Show {relationship.badges.length - 10} more badges"
						>
							+{relationship.badges.length - 10} more
						</button>
					{/if}
				</div>
			{/if}

			{#if user.bio}
				<p class="text-xs text-muted-foreground">{user.bio}</p>
			{/if}
		</div>
	</div>

	{#if history.length}
		<div class="max-h-40 overflow-y-auto border-t px-4 py-2">
			{#each history.toReversed() as message (message.id)}
				<div class="origin-left scale-80">
					<Message {message} nested />
				</div>
			{/each}
		</div>
	{/if}
{/snippet}
