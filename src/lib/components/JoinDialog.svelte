<script lang="ts">
	import { DialogClose } from "@ui-sdk/svelte/dialog";

	import type { ChannelSuggestion } from "#lib/graphql/twitch.js";
	import type { Channel } from "#lib/models/channel.svelte.js";
	import type { RecentSearch } from "#lib/stores.js";

	import { app } from "#lib/app.svelte.js";
	import { closeDialog, dialogs } from "#lib/dialog.js";
	import { searchSuggestionsQuery } from "#lib/graphql/twitch.js";
	import {
		IconChannels,
		IconClose,
		IconJoin,
		IconLoading,
		IconRecent,
		IconRemove,
	} from "#lib/icons.js";
	import { log } from "#lib/log.js";
	import { storage } from "#lib/stores.js";
	import { debounce } from "#lib/util/index.js";
	import { latest } from "#lib/util/resource.js";
	import { cn } from "#lib/util/styles.js";

	import Avatar from "./ui/Avatar.svelte";
	import Dialog from "./ui/Dialog.svelte";

	type Filter = "all" | "live";

	const filters: { key: Filter; label: string }[] = [
		{ key: "all", label: "All" },
		{ key: "live", label: "Live" },
	];

	const request = latest();

	let value = $state("");
	let filter = $state<Filter>("all");
	let loading = $state(false);
	let searching = $state(false);
	let error = $state<string | null>(null);
	let suggestions = $state<ChannelSuggestion[]>([]);
	let active = $state(0);

	const isSearch = $derived(!!value.trim());

	const rows = $derived.by(() => {
		if (!isSearch) return storage.state.recentSearches;

		const base = suggestions.map(toRow);

		return filter === "live" ? base.filter((r) => r.isLive) : base;
	});

	const suggest = debounce(search, 300);

	$effect(() => suggest(value));

	// Reset the highlighted row whenever the list changes underneath it.
	$effect(() => {
		void rows;
		active = 0;
	});

	$effect(() => () => cancelSearch());

	function toRow(suggestion: ChannelSuggestion): RecentSearch {
		return {
			id: suggestion.id,
			login: suggestion.user?.login ?? "",
			displayName: suggestion.user?.displayName ?? "",
			profileImageURL: suggestion.profileImageURL ?? "",
			isLive: suggestion.isLive,
			streamTitle: suggestion.user?.stream?.title ?? null,
		};
	}

	async function search(query: string) {
		error = null;

		const signal = request.next();

		if (!query.trim()) {
			suggestions = [];
			searching = false;
			return;
		}

		searching = true;

		try {
			const { searchSuggestions } = await app.twitch.gql(
				searchSuggestionsQuery,
				{ query },
				{ signal },
			);

			if (signal.aborted) return;

			const channels: ChannelSuggestion[] = [];

			for (const edge of searchSuggestions?.edges ?? []) {
				const content = edge.node.content;

				if (content?.__typename === "SearchSuggestionChannel") {
					channels.push(content);
				}
			}

			suggestions = channels;
		} catch (err) {
			if (!signal.aborted) {
				error = err instanceof Error ? err.message : String(err);
			}
		} finally {
			if (!signal.aborted) {
				searching = false;
			}
		}
	}

	async function join(login: string, meta?: RecentSearch) {
		login = login.trim().toLowerCase();
		if (loading || !login) return;

		try {
			loading = true;

			const channel = await app.resolveLogin(login);
			record(channel, meta);
			closeDialog(dialogs.join);

			app.open(channel).catch(log.swallow(`Failed to join ${login}`));
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

	function cancelSearch() {
		suggest.cancel();
		request.abort();
	}

	function reset() {
		cancelSearch();

		value = "";
		filter = "all";
		error = null;
		suggestions = [];
		searching = false;
		active = 0;
	}
</script>

<Dialog
	id={dialogs.join}
	class="max-w-xl"
	bodyClass="gap-0 p-0"
	aria-label="Search channels"
	onOpenChangeComplete={(open) => {
		if (!open) reset();
	}}
>
	<div class="flex flex-col">
		<div class="flex items-center gap-2 border-b border-line px-3 py-2">
			<!-- svelte-ignore a11y_autofocus -- palette should be typeable on open -->
			<input
				class="h-control w-full bg-transparent text-sm outline-none placeholder:text-fg-faint"
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

			{#if searching || loading}
				<IconLoading class="size-4 shrink-0 animate-spin text-fg-muted" />
			{/if}

			<DialogClose
				class="flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted control-focus transition-colors hover:bg-surface-3 hover:text-fg"
				aria-label="Close"
			>
				<IconClose class="size-4" />
			</DialogClose>
		</div>

		<div class="flex items-center gap-4 border-b border-line px-3 text-xs">
			{#each filters as { key, label } (key)}
				<button
					class={cn(
						"-mb-px border-b py-2 font-medium transition-colors",
						filter === key
							? "border-fg text-fg"
							: "border-transparent text-fg-muted hover:text-fg",
					)}
					type="button"
					onclick={() => (filter = key)}
				>
					{label}
				</button>
			{/each}
		</div>

		<div class="max-h-96 min-h-32 overflow-y-auto p-1.5">
			{#if error}
				<p class="px-2 py-1.5 text-xs text-danger">{error}</p>
			{/if}

			{#if rows.length}
				<div class="section-label flex items-center gap-1.5 px-2 pt-1 pb-1.5">
					{#if isSearch}
						<IconChannels class="size-4" />
						Channels
					{:else}
						<IconRecent class="size-4" />
						Recent searches
					{/if}
				</div>

				{#each rows as item, index (item.id)}
					<!-- svelte-ignore a11y_no_static_element_interactions -- keyboard nav lives on the search input -->
					<div
						class={cn(
							"group flex items-center rounded-control transition-colors",
							active === index ? "bg-surface-3" : "hover:bg-surface-3/60",
						)}
						onmouseenter={() => (active = index)}
					>
						<button
							class="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
							type="button"
							onclick={() => join(item.login, item)}
						>
							<Avatar
								class="size-7 shrink-0"
								src={item.profileImageURL}
								alt={item.displayName}
							/>

							<div class="w-full min-w-0 flex-1">
								<span class="font-semibold">{item.displayName}</span>

								{#if isSearch && item.streamTitle}
									<p
										class="truncate text-xs text-fg-muted"
										title={item.streamTitle}
									>
										{item.streamTitle}
									</p>
								{/if}
							</div>

							{#if isSearch && item.isLive}
								<span class="flex items-center gap-1.5 text-red-500">
									<span class="size-1.5 animate-pulse rounded-full bg-current"
									></span>
									<span class="text-xs font-medium">Live</span>
								</span>
							{/if}
						</button>

						{#if isSearch}
							<IconJoin class="mr-2 size-3.5 shrink-0 text-fg-muted" />
						{:else}
							<button
								class="mr-1 flex size-7 shrink-0 items-center justify-center rounded-control text-fg-muted opacity-0 transition-[opacity,color] group-hover:opacity-100 hover:text-fg focus-visible:opacity-100"
								type="button"
								aria-label="Remove from recent searches"
								onclick={(event) => removeRecent(event, item.id)}
							>
								<IconRemove class="size-3.5" />
							</button>
						{/if}
					</div>
				{/each}
			{:else if searching}
				<p class="flex items-center gap-2 px-2 py-8 text-xs text-fg-muted">
					<IconLoading class="animate-spin" />
					Searching&hellip;
				</p>
			{:else if isSearch}
				<p class="px-2 py-8 text-center text-xs text-fg-muted">No channels found.</p>
			{:else}
				<p class="px-2 py-8 text-center text-xs text-fg-muted">
					Search for a channel to join.
				</p>
			{/if}
		</div>
	</div>
</Dialog>
