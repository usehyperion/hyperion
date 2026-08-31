<script lang="ts">
	import { Avatar } from "bits-ui";
	import dayjs from "dayjs";
	import localizedFormat from "dayjs/plugin/localizedFormat";

	import { app } from "$lib/app.svelte";
	import { log } from "$lib/log";
	import type { Channel } from "$lib/models/channel.svelte";
	import type { UserMessage } from "$lib/models/message/user-message.svelte";
	import type { Relationship } from "$lib/models/user.svelte";
	import type { User } from "$lib/models/user.svelte";
	import { timeoutDuration, timeoutLabel } from "$lib/moderation";

	import ArrowSquareOut from "~icons/ph/arrow-square-out";
	import Cake from "~icons/ph/cake-fill";
	import Heart from "~icons/ph/heart-fill";
	import StarOutline from "~icons/ph/star";
	import Star from "~icons/ph/star-fill";
	import UserIcon from "~icons/ph/user-bold";

	import Message from "./message/Message.svelte";
	import Button from "./ui/Button.svelte";

	dayjs.extend(localizedFormat);

	interface Props {
		user: User;

		/**
		 * The channel the card is scoped to. Required for moderation actions.
		 */
		channel?: Channel;
		relationship?: Relationship;
		history?: UserMessage[];
		loading?: boolean;

		/**
		 * Opens this card in its own window. Omitted when the card is already
		 * rendered inside a popout.
		 */
		onPopout?: () => void;
	}

	const {
		user,
		channel,
		relationship,
		history = [],
		loading = false,
		onPopout,
	}: Props = $props();

	let pending = $state(false);

	// Mirrors `UserMessage.actionable`: mods may act on themselves or on any
	// viewer who is not themselves a moderator.
	const canModerate = $derived(
		channel?.isMod && (app.user?.id === user.id || !channel.viewers.get(user.id)?.moderator),
	);

	async function moderate(label: string, action: () => Promise<void>) {
		if (pending) return;

		try {
			pending = true;
			await action();
		} catch (error) {
			void log.error(`Failed to ${label} ${user.username}: ${String(error)}`).catch(() => {});
		} finally {
			pending = false;
		}
	}

	let showAllBadges = $state(false);
</script>

<div class="relative h-18 bg-twitch" style:background-color={user.color}>
	{#if onPopout}
		<button
			class="absolute top-2 left-2 z-10 rounded bg-black/40 p-1 text-white/80 transition-colors hover:bg-black/60 hover:text-white"
			type="button"
			onclick={onPopout}
			aria-label="Open {user.displayName} in a new window"
		>
			<ArrowSquareOut class="size-4" />
		</button>
	{/if}

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
			{@const badges = showAllBadges ? relationship.badges : relationship.badges.slice(0, 10)}

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

		{#if channel && canModerate}
			<div class="flex flex-wrap items-center gap-1.5 pt-1">
				<Button
					size="sm"
					variant="secondary"
					disabled={pending}
					onclick={() =>
						moderate("time out", () =>
							channel.viewers.timeout(user.id, { duration: timeoutDuration() }),
						)}
				>
					Timeout {timeoutLabel()}
				</Button>

				<Button
					size="sm"
					variant="destructive"
					disabled={pending}
					onclick={() => moderate("ban", () => channel.viewers.ban(user.id))}
				>
					Ban
				</Button>

				<Button
					size="sm"
					variant="outline"
					disabled={pending}
					onclick={() => moderate("unban", () => channel.viewers.unban(user.id))}
				>
					Unban
				</Button>
			</div>
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
