<script lang="ts">
	import { Avatar } from "bits-ui";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";

	import Cake from "~icons/ph/cake-fill";
	import Heart from "~icons/ph/heart-fill";
	import StarOutline from "~icons/ph/star";
	import Star from "~icons/ph/star-fill";
	import UserIcon from "~icons/ph/user-bold";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import { log } from "#lib/log.js";
	import { settings } from "#lib/settings/index.js";

	import Message from "../message/Message.svelte";
	import ReverseScroll from "../ReverseScroll.svelte";
	import Popover from "../ui/Popover.svelte";

	dayjs.extend(localizedFormat);

	interface Props {
		id: string;
		user: User;
		channel: Channel;
		onclose?: () => void;
	}

	const { id, user, channel, onclose }: Props = $props();

	let loading = $state(false);
	let loadingHistory = $state(false);
	let showAllBadges = $state(false);

	const relationship = $derived(user.relationships.get(channel.id));
	const history = $derived(channel.viewers.get(user.id)?.history);
	const messages = $derived(history?.messages ?? []);

	async function fetchInfo() {
		try {
			loading = true;

			if (user.partial) {
				await user.fetch();
			}

			if (!relationship) {
				await user.fetchRelationship(channel);
			}
		} finally {
			loading = false;
		}
	}

	async function loadHistory() {
		if (!history) return;

		try {
			loadingHistory = true;
			await history.load();
		} catch (error) {
			void log.error(`Failed to load message history: ${String(error)}`).catch(() => {});
		} finally {
			loadingHistory = false;
		}
	}
</script>

<Popover
	{id}
	class="w-sm overflow-hidden p-0"
	onbeforetoggle={(event) => {
		if (event.newState !== "open") return;

		void fetchInfo();
		void loadHistory();
	}}
	ontoggle={async (event) => {
		if (event.newState !== "closed") return;

		const popover = event.currentTarget;

		await Promise.allSettled(popover.getAnimations().map((animation) => animation.finished));

		if (!popover.matches(":popover-open")) onclose?.();
	}}
>
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
				{#if !relationship?.subscription.tier}
					<StarOutline class="mr-1 size-3" />
				{:else}
					<Star class="mr-1 size-3" />
				{/if}

				{#if loading}
					Loading...
				{:else if relationship?.subscription.months}
					{@const { tier, type, months } = relationship.subscription}
					{@const noun = `month${months > 1 ? "s" : ""}`}

					{#if tier}
						{type === "prime" ? "Prime" : `Tier ${tier}`} ({months} {noun})
					{:else}
						{months} {noun}
					{/if}
				{:else}
					Subscription unknown
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

	{#if history && messages.length}
		<div class="h-24 border-t">
			<ReverseScroll
				class="px-4"
				data={messages}
				showJumpButton={false}
				getKey={(message) => message.id}
				lazy={history.hasOlder}
				onloadmore={() => history.loadOlder()}
			>
				{#snippet children(message)}
					<div
						class="origin-left scale-80"
						data-deleted={message.deleted
							? settings.state["moderation.deleted.appearance"]
							: undefined}
					>
						<Message {message} nested />
					</div>
				{/snippet}
			</ReverseScroll>
		</div>
	{:else if loadingHistory}
		<p class="border-t px-4 py-2 text-xs text-muted-foreground">Loading message history...</p>
	{/if}
</Popover>
