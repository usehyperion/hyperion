<script lang="ts">
	import { tick } from "svelte";
	import { SvelteMap } from "svelte/reactivity";

	import ArrowsClockwise from "~icons/ph/arrows-clockwise";
	import MagnifyingGlass from "~icons/ph/magnifying-glass";
	import Users from "~icons/ph/users";
	import X from "~icons/ph/x";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import { log } from "#lib/log.js";
	import { type Chatter, type ChatterRole, mergeChatters } from "#lib/managers/viewer-manager.js";

	import Button from "../ui/Button.svelte";
	import * as Empty from "../ui/empty";
	import * as InputGroup from "../ui/input-group";
	import Sheet from "../ui/Sheet.svelte";
	import UserCard from "../user/UserCard.svelte";

	interface Group {
		role: ChatterRole;
		label: string;
	}

	interface Selection {
		user: User;
		anchor: HTMLElement;
	}

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const groups: Group[] = [
		{ role: "broadcaster", label: "Broadcaster" },
		{ role: "staff", label: "Staff" },
		{ role: "moderator", label: "Moderators" },
		{ role: "vip", label: "VIPs" },
		{ role: "chatbot", label: "Chatbots" },
		{ role: "viewer", label: "Viewers" },
	];

	let sheet = $state<HTMLDialogElement | null>(null);
	let search = $state<HTMLInputElement | null>(null);

	let query = $state("");
	let loading = $state(false);
	let error = $state(false);
	let count = $state<number | null>(null);
	let chatters = $state.raw<Chatter[]>([]);

	let selected = $state.raw<Selection | null>(null);
	let resolving = $state<string | null>(null);

	const id = $derived(`viewer-list-${channel.id}`);
	const cardId = $derived(`viewer-card-${channel.id}`);

	const filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return chatters;

		return chatters.filter(
			(chatter) =>
				chatter.login.includes(needle) ||
				chatter.viewer?.displayName.toLowerCase().includes(needle),
		);
	});

	const sections = $derived.by(() => {
		const byRole = Map.groupBy(filtered, (chatter) => chatter.role);

		return groups.flatMap(({ role, label }) => {
			const chatters = byRole.get(role);
			return chatters ? [{ role, label, chatters }] : [];
		});
	});

	let token = 0;

	async function refresh() {
		const current = ++token;

		loading = true;
		error = false;

		let roles = new Map<string, ChatterRole>();

		try {
			const list = await channel.viewers.fetchChatters();
			if (current !== token) return;

			roles = list.roles;
			count = list.count;
		} catch (cause) {
			if (current !== token) return;

			error = true;
			log.error("Failed to fetch chatters", cause);
		}

		// Snapshot the merge so new chat activity doesn't reshuffle the list
		// while it's being browsed. Refreshing picks up new viewers.
		chatters = mergeChatters(roles, channel.viewers.values());
		loading = false;
	}

	function open() {
		sheet?.showModal();
		search?.focus();

		void refresh();
	}

	async function select(chatter: Chatter, anchor: HTMLElement) {
		if (resolving) return;

		try {
			resolving = chatter.login;

			const user =
				chatter.viewer?.user ??
				(await channel.client.users.fetch(chatter.login, { by: "login" }));

			selected = { user, anchor };

			await tick();
			document.getElementById(cardId)?.showPopover();
		} catch (cause) {
			log.error(`Failed to fetch user ${chatter.login}`, cause);
		} finally {
			resolving = null;
		}
	}
</script>

<Button
	class="size-8 rounded-none border-r text-muted-foreground hover:text-foreground"
	size="icon-sm"
	variant="ghost"
	aria-label="Viewer list"
	aria-haspopup="dialog"
	onclick={open}
>
	<Users class="size-3.5" />
</Button>

<Sheet
	{id}
	aria-label="Viewer list"
	onclose={() => {
		query = "";
		selected = null;
	}}
	bind:ref={sheet}
>
	{#snippet header()}
		<div class="flex items-center gap-1">
			<div class="mr-auto flex items-baseline gap-1.5">
				<h2 class="text-sm font-semibold">Viewers</h2>

				{#if count !== null}
					<span class="text-xs text-muted-foreground tabular-nums">
						{count.toLocaleString()} in chat
					</span>
				{/if}
			</div>

			<Button
				disabled={loading}
				size="icon-sm"
				variant="ghost"
				aria-label="Refresh viewer list"
				onclick={refresh}
			>
				<ArrowsClockwise class={["size-3.5", loading && "animate-spin"]} />
			</Button>

			<Button
				command="close"
				commandfor={id}
				size="icon-sm"
				variant="ghost"
				aria-label="Close viewer list"
			>
				<X class="size-3.5" />
			</Button>
		</div>

		<InputGroup.Root>
			<InputGroup.Addon>
				<MagnifyingGlass />
			</InputGroup.Addon>

			<InputGroup.Input
				type="search"
				placeholder="Search viewers"
				autocomplete="off"
				spellcheck="false"
				aria-label="Search viewers"
				bind:ref={search}
				bind:value={query}
			/>
		</InputGroup.Root>

		{#if error}
			<p class="text-xs text-destructive">
				Couldn't load the full viewer list. Showing viewers seen in chat.
			</p>
		{/if}
	{/snippet}

	{#if sections.length}
		{#each sections as section (section.role)}
			<section class="pb-2">
				<h3
					class="sticky top-0 z-10 flex items-center justify-between bg-popover px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase"
				>
					{section.label}
					<span class="tabular-nums">{section.chatters.length.toLocaleString()}</span>
				</h3>

				<ul class="px-1.5">
					{#each section.chatters as chatter (chatter.login)}
						{@const user =
							chatter.viewer?.user ?? channel.client.users.getByLogin(chatter.login)}

						<li class="[contain-intrinsic-size:auto_1.75rem] [content-visibility:auto]">
							<button
								class="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
								disabled={resolving === chatter.login}
								onclick={(event) => select(chatter, event.currentTarget)}
							>
								{#if user}
									<span class="truncate font-semibold" style={user.style}>
										{user.displayName}
									</span>
								{:else}
									<span class="truncate">{chatter.login}</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	{:else if !loading}
		<Empty.Root class="h-full">
			<Empty.Header>
				<Empty.Media variant="icon">
					<Users />
				</Empty.Media>

				{#if query.trim()}
					<Empty.Title>No matches</Empty.Title>
					<Empty.Description>No viewers match "{query.trim()}".</Empty.Description>
				{:else}
					<Empty.Title>No viewers</Empty.Title>
					<Empty.Description>Nobody is in chat right now.</Empty.Description>
				{/if}
			</Empty.Header>
		</Empty.Root>
	{/if}

	{#if selected}
		{@const current = selected}

		{#key current}
			<UserCard
				id={cardId}
				user={current.user}
				anchor={current.anchor}
				{channel}
				onclose={() => {
					if (selected === current) selected = null;
				}}
			/>
		{/key}
	{/if}
</Sheet>
