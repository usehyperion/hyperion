<script lang="ts">
	import {
		createDrawerController,
		DrawerClose,
		DrawerTitle,
		DrawerTrigger,
	} from "@ui-sdk/svelte/drawer";
	import { createPopoverController } from "@ui-sdk/svelte/popover";
	import { tick } from "svelte";

	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { User } from "#lib/models/user.svelte.js";

	import { IconClose, IconRefresh, IconSearch, IconViewers } from "#lib/icons.js";
	import { log } from "#lib/log.js";
	import {
		CHATTER_ROLES,
		ChatterList,
		type Chatter,
		type ChatterRole,
	} from "#lib/models/chatter-list.svelte.js";

	import Button from "../ui/Button.svelte";
	import Empty from "../ui/Empty.svelte";
	import InputGroup from "../ui/InputGroup.svelte";
	import Sheet from "../ui/Sheet.svelte";
	import UserCard from "../user/UserCard.svelte";

	interface Selection {
		user: User;
		anchor: HTMLElement;
	}

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const labels: Record<ChatterRole, string> = {
		broadcaster: "Broadcaster",
		staff: "Staff",
		moderator: "Moderators",
		vip: "VIPs",
		chatbot: "Chatbots",
		viewer: "Viewers",
	};

	const sheet = createDrawerController();
	const card = createPopoverController();

	let search = $state<HTMLInputElement | null>(null);

	let query = $state("");

	let selected = $state.raw<Selection | null>(null);
	let resolving = $state<string | null>(null);

	const list = $derived(new ChatterList(channel));

	const filtered = $derived.by(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return list.chatters;

		return list.chatters.filter(
			(chatter) =>
				chatter.login.includes(needle) ||
				chatter.user?.displayName.toLowerCase().includes(needle),
		);
	});

	const sections = $derived.by(() => {
		const byRole = Map.groupBy(filtered, (chatter) => chatter.role);

		return CHATTER_ROLES.flatMap((role) => {
			const chatters = byRole.get(role);
			return chatters ? [{ role, label: labels[role], chatters }] : [];
		});
	});

	async function select(chatter: Chatter, anchor: HTMLElement) {
		if (resolving) return;

		try {
			resolving = chatter.login;

			const viewer = await list.resolve(chatter);
			selected = { user: viewer.user, anchor };

			await tick();
			void card.open({ anchor });
		} catch (cause) {
			log.error(`Failed to fetch user ${chatter.login}`, cause);
		} finally {
			resolving = null;
		}
	}
</script>

<DrawerTrigger controller={sheet}>
	{#snippet render({ props })}
		<Button
			{...props}
			class="size-8 rounded-none border-r text-fg-muted hover:text-fg"
			size="icon-sm"
			variant="ghost"
			aria-label="Viewer list"
		>
			<IconViewers class="size-3.5" />
		</Button>
	{/snippet}
</DrawerTrigger>

<Sheet
	controller={sheet}
	initialFocus={() => search}
	onOpenChange={(open) => {
		if (open) void list.refresh();
	}}
	onOpenChangeComplete={(open) => {
		if (open) return;

		query = "";
		selected = null;
	}}
>
	{#snippet header()}
		<div class="flex items-center gap-1">
			<div class="mr-auto flex items-baseline gap-1.5">
				<DrawerTitle class="text-ui font-semibold">Viewers</DrawerTitle>

				{#if list.count !== null}
					<span class="text-2xs text-fg-muted tabular-nums">
						{list.count.toLocaleString()} in chat
					</span>
				{/if}
			</div>

			<Button
				disabled={list.loading}
				size="icon-sm"
				variant="ghost"
				aria-label="Refresh viewer list"
				onclick={() => list.refresh()}
			>
				<IconRefresh class={["size-3.5", list.loading && "animate-spin"]} />
			</Button>

			<DrawerClose>
				{#snippet render({ props })}
					<Button
						{...props}
						size="icon-sm"
						variant="ghost"
						aria-label="Close viewer list"
					>
						<IconClose class="size-3.5" />
					</Button>
				{/snippet}
			</DrawerClose>
		</div>

		<InputGroup
			type="search"
			clearable
			clearLabel="Clear search"
			placeholder="Search viewers"
			autocomplete="off"
			spellcheck="false"
			aria-label="Search viewers"
			bind:ref={search}
			bind:value={query}
		>
			{#snippet start()}<IconSearch />{/snippet}
		</InputGroup>

		{#if list.error}
			<p class="text-xs text-danger">
				Couldn't load the full viewer list. Showing viewers seen in chat.
			</p>
		{/if}
	{/snippet}

	{#if sections.length}
		{#each sections as section (section.role)}
			<section class="pb-2">
				<h3
					class="section-label sticky top-0 z-10 flex items-center justify-between bg-surface-1 px-3 pt-3 pb-1"
				>
					{section.label}
					<span class="tabular-nums">{section.chatters.length.toLocaleString()}</span>
				</h3>

				<ul class="px-1.5">
					{#each section.chatters as chatter (chatter.login)}
						{@const user = chatter.user}

						<li class="[contain-intrinsic-size:auto_1.75rem] [content-visibility:auto]">
							<button
								class="flex h-7 w-full min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left text-sm transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none disabled:opacity-50"
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
	{:else if !list.loading}
		<Empty
			class="h-full"
			icon={IconViewers}
			title={query.trim() ? "No matches" : "No viewers"}
			description={query.trim()
				? `No viewers match "${query.trim()}".`
				: "Nobody is in chat right now."}
		/>
	{/if}

	{#if selected}
		{@const current = selected}

		{#key current}
			<UserCard
				controller={card}
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
