<script lang="ts">
	import dayjs from "dayjs";
	import { onMount } from "svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { MessageHistory } from "#lib/models/message-history.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import {
		IconAvatarFallback,
		IconCreated,
		IconFollowing,
		IconPopout,
		IconSubscriber,
	} from "#lib/icons.js";
	import { log } from "#lib/log.js";
	import { deletedAppearance } from "#lib/settings.js";

	import Message from "../message/Message.svelte";
	import ReverseScroll from "../ReverseScroll.svelte";
	import Avatar from "../ui/Avatar.svelte";

	interface Props {
		user: User;
		channel: Channel;
		history?: MessageHistory;

		/**
		 * Whether the message history fills the remaining height, e.g. when the
		 * card is rendered in its own window.
		 */
		fill?: boolean;

		/**
		 * Opens the card in its own window. Omitted when the card is already in
		 * one.
		 */
		onpopout?: () => void;
	}

	const { user, channel, history, fill = false, onpopout }: Props = $props();

	let loading = $state(false);
	let loadingHistory = $state(false);
	let showAllBadges = $state(false);

	const relationship = $derived(user.relationships.get(channel.id));
	const messages = $derived(history?.messages ?? []);

	// The body is only mounted while the card is shown
	onMount(() => {
		void fetchInfo();
		void loadHistory();
	});

	async function fetchInfo() {
		try {
			loading = true;

			if (user.partial) {
				await user.fetch();
			}

			if (!relationship) {
				await user.fetchRelationship(channel);
			}
		} catch (error) {
			log.error("Failed to fetch user info", error);
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
			log.error("Failed to load message history", error);
		} finally {
			loadingHistory = false;
		}
	}
</script>

<div class="relative h-18 shrink-0 bg-accent" style:background-color={user.color}>
	{#if onpopout}
		<button
			class="absolute top-2 left-2 z-10 rounded bg-black/40 p-1 text-white/80 transition-colors hover:bg-black/60 hover:text-white"
			type="button"
			onclick={onpopout}
			aria-label="Open {user.displayName} in a new window"
		>
			<IconPopout class="size-4" />
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

<div class="relative shrink-0 border-t p-4">
	<Avatar
		class="-mt-14 flex size-20 border-4 border-surface-1 ring-0 not-data-[loading-status=loaded]:bg-fg"
		src={user.avatarUrl}
		alt={user.displayName}
	>
		{#snippet fallback()}
			<IconAvatarFallback class="size-10 text-fg-inverse" aria-hidden="true" />
		{/snippet}
	</Avatar>

	<div class="absolute top-2 right-2 space-y-1 text-detail text-fg-muted">
		<div class="flex items-center gap-1">
			<IconCreated class="mr-1 size-3" />

			{#if loading}
				Loading...
			{:else if user.createdAt}
				<time datetime={user.createdAt.toISOString()}>
					{dayjs(user.createdAt).format("LL")}
				</time>
			{:else}
				Unknown
			{/if}
		</div>

		<div class="flex items-center gap-1">
			<IconFollowing class="mr-1 size-3" />

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
			<IconSubscriber
				class={["mr-1 size-3", relationship?.subscription.tier && "*:fill-current"]}
			/>

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
						class="ml-1 text-detail text-accent transition-colors hover:text-fg"
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
			<p class="text-detail text-fg-muted">{user.bio}</p>
		{/if}
	</div>
</div>

{#if history && messages.length}
	<div class={["border-t", fill ? "min-h-24 grow" : "h-24"]}>
		<ReverseScroll
			class="px-4"
			data={messages}
			showJumpButton={false}
			getKey={(message) => message.id}
			lazy={history.hasOlder}
			onloadmore={() => history.loadOlder()}
		>
			{#snippet children(message)}
				<div class="origin-left scale-80" data-deleted={deletedAppearance(message)}>
					<Message {message} nested />
				</div>
			{/snippet}
		</ReverseScroll>
	</div>
{:else if loadingHistory}
	<p class="border-t px-4 py-2 text-detail text-fg-muted">Loading message history...</p>
{/if}
