<script lang="ts">
	import { cn } from "tailwind-variants";
	import { app } from "$lib/app.svelte";
	import { searchSuggestionsQuery } from "$lib/graphql/twitch";
	import type { ChannelSuggestion } from "$lib/graphql/twitch";
	import type { Channel } from "$lib/models/channel.svelte";
	import { storage } from "$lib/stores";
	import type { RecentSearch } from "$lib/stores";
	import { debounce } from "$lib/util";
	import Broadcast from "~icons/ph/broadcast";
	import CaretRight from "~icons/ph/caret-right";
	import ClockCounterClockwise from "~icons/ph/clock-counter-clockwise";
	import Spinner from "~icons/ph/spinner";
	import X from "~icons/ph/x";
	import Dialog from "./ui/Dialog.svelte";

	type Filter = "all" | "live";

	const filters: { key: Filter; label: string }[] = [
		{ key: "all", label: "All" },
		{ key: "live", label: "Live" },
	];

	let value = $state("");
	let filter = $state<Filter>("all");
	let loading = $state(false);
	let searching = $state(false);
	let error = $state<string | null>(null);
	let suggestions = $state<ChannelSuggestion[]>([]);
	let active = $state(0);

	const rows = $derived.by(() => {
		const base: RecentSearch[] = value.trim()
			? suggestions.map(toRow)
			: storage.state.recentSearches;

		return filter === "live" ? base.filter((r) => r.isLive) : base;
	});

	const suggest = debounce(search, 300);

	$effect(() => suggest(value));

	// Reset the highlighted row whenever the list changes underneath it.
	$effect(() => {
		void rows;
		active = 0;
	});

	function toRow(suggestion: ChannelSuggestion): RecentSearch {
		const displayName = suggestion.user?.displayName ?? "";

		return {
			id: suggestion.id,
			login: displayName.toLowerCase(),
			displayName,
			profileImageURL: suggestion.profileImageURL ?? "",
			isLive: suggestion.isLive,
			streamTitle: suggestion.user?.stream?.title ?? null,
		};
	}

	// A monotonic token discards responses that resolve out of order, so a slow
	// early query can't clobber the results of a later one.
	let token = 0;

	async function search(query: string) {
		error = null;

		const current = ++token;

		if (!query.trim()) {
			suggestions = [];
			searching = false;
			return;
		}

		searching = true;

		try {
			const { searchSuggestions } = await app.twitch.gql(searchSuggestionsQuery, { query });
			if (current !== token) return;

			const channels: ChannelSuggestion[] = [];

			for (const edge of searchSuggestions?.edges ?? []) {
				const content = edge.node.content;

				if (content?.__typename === "SearchSuggestionChannel") {
					channels.push(content);
				}
			}

			suggestions = channels;
		} finally {
			if (current === token) searching = false;
		}
	}

	async function join(login: string, meta?: RecentSearch) {
		login = login.trim().toLowerCase();
		if (loading || !login) return;

		try {
			loading = true;

			let channel = app.channels.getByLogin(login);

			if (!channel) {
				channel = await app.channels.fetch(login, { by: "login" });
				channel.ephemeral = true;

				app.channels.set(channel.id, channel);
			}

			await app.open(channel);
			record(channel, meta);
			handleClose();
		} catch (err) {
			error = err instanceof Error ? err.message : "An unknown error occurred.";
		} finally {
			loading = false;
		}
	}

	function record(channel: Channel, meta?: RecentSearch) {
		const entry: RecentSearch = meta ?? {
			id: channel.id,
			login: channel.user.username,
			displayName: channel.user.displayName,
			profileImageURL: channel.user.avatarUrl,
			isLive: !!channel.stream,
			streamTitle: channel.stream?.title ?? null,
		};

		const recents = storage.state.recentSearches.filter((r) => r.id !== entry.id);
		recents.unshift(entry);

		storage.state.recentSearches = recents.slice(0, 6);
	}

	function removeRecent(event: MouseEvent, id: string) {
		event.stopPropagation();
		storage.state.recentSearches = storage.state.recentSearches.filter((r) => r.id !== id);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (rows.length) active = (active + 1) % rows.length;
		} else if (event.key === "ArrowUp") {
			event.preventDefault();
			if (rows.length) active = (active - 1 + rows.length) % rows.length;
		} else if (event.key === "Enter") {
			event.preventDefault();
			const row = rows[active];

			if (row) {
				join(row.login, row);
			} else if (value.trim()) {
				join(value);
			}
		}
	}

	function reset() {
		value = "";
		filter = "all";
		error = null;
		suggestions = [];
		active = 0;
	}

	function handleClose() {
		document.querySelector<HTMLDialogElement>("#join-dialog")?.close();
		reset();
	}
</script>

<Dialog id="join-dialog" class="overflow-hidden p-0 sm:max-w-xl">
	<div class="flex flex-col">
		<div class="flex items-center gap-3 border-b px-5 py-4">
			<!-- svelte-ignore a11y_autofocus -- palette should be typeable on open -->
			<input
				class="w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground"
				autocapitalize="off"
				autocomplete="off"
				autocorrect="off"
				autofocus
				spellcheck="false"
				placeholder="Search..."
				aria-invalid={error != null}
				{onkeydown}
				bind:value
			/>

			{#if searching}
				<Spinner class="size-5 shrink-0 animate-spin text-muted-foreground" />
			{/if}

			<button
				class="flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-[color,scale] hover:text-foreground active:scale-[0.96]"
				type="button"
				aria-label="Close"
				onclick={handleClose}
			>
				<X class="size-5" />
			</button>
		</div>

		<div class="flex items-center gap-6 border-b px-5 text-sm">
			{#each filters as { key, label } (key)}
				<button
					class={cn(
						"-mb-px border-b-2 py-3 font-medium transition-colors",
						filter === key
							? "border-foreground text-foreground"
							: "border-transparent text-muted-foreground hover:text-foreground",
					)}
					type="button"
					onclick={() => (filter = key)}
				>
					{label}
				</button>
			{/each}
		</div>

		<div class="max-h-96 min-h-32 overflow-y-auto p-2">
			{#if error}
				<p class="px-3 py-2 text-sm text-destructive">{error}</p>
			{/if}

			{#if rows.length}
				<div
					class="flex items-center gap-2 px-3 pt-1 pb-2 text-xs font-medium text-muted-foreground"
				>
					{#if value.trim()}
						<Broadcast class="size-4" />
						Channels
					{:else}
						<ClockCounterClockwise class="size-4" />
						Recent searches
					{/if}
				</div>

				{#each rows as item, index (item.id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -- keyboard nav lives on the search input -->
					<div
						class={cn(
							"group flex items-center rounded-2xl transition-colors",
							active === index ? "bg-accent" : "hover:bg-accent/60",
						)}
						onmouseenter={() => (active = index)}
					>
						<button
							class="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left"
							type="button"
							onclick={() => join(item.login, item)}
						>
							<img
								class="size-9 shrink-0 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
								src={item.profileImageURL}
								alt={item.displayName}
							/>

							<div class="w-full min-w-0 flex-1">
								<span class="font-semibold">{item.displayName}</span>

								{#if item.streamTitle}
									<p class="truncate text-sm" title={item.streamTitle}>
										{item.streamTitle}
									</p>
								{/if}
							</div>

							{#if item.isLive}
								<span class="flex items-center gap-1.5 text-red-500">
									<span class="size-2 animate-pulse rounded-full bg-current"
									></span>
									<span class="text-sm font-medium">Live</span>
								</span>
							{/if}
						</button>

						{#if value.trim()}
							<CaretRight class="mr-3 size-4 shrink-0 text-muted-foreground" />
						{:else}
							<button
								class="mr-1.5 flex size-10 shrink-0 items-center justify-center text-muted-foreground opacity-0 transition-[opacity,color,scale] group-hover:opacity-100 hover:text-foreground active:scale-[0.96]"
								type="button"
								aria-label="Remove from recent searches"
								onclick={(event) => removeRecent(event, item.id)}
							>
								<X class="size-4" />
							</button>
						{/if}
					</div>
				{/each}
			{:else if searching}
				<p class="flex items-center gap-2 px-3 py-8 text-sm text-muted-foreground">
					<Spinner class="animate-spin" />
					Searching&hellip;
				</p>
			{:else if value.trim()}
				<p class="px-3 py-8 text-center text-sm text-muted-foreground">
					No channels found.
				</p>
			{:else}
				<p class="px-3 py-8 text-center text-sm text-muted-foreground">
					Search for a channel to join.
				</p>
			{/if}
		</div>
	</div>
</Dialog>
