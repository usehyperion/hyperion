<script lang="ts">
	import { Combobox } from "bits-ui";
	import { tick } from "svelte";
	import { app } from "$lib/app.svelte";
	import { searchSuggestionsQuery } from "$lib/graphql/twitch";
	import type { ChannelSuggestion } from "$lib/graphql/twitch";
	import { debounce } from "$lib/util";
	import Spinner from "~icons/ph/spinner";
	import { Button } from "./ui/button";
	import Dialog from "./ui/Dialog.svelte";
	import * as Field from "./ui/field";
	import { Input } from "./ui/input";

	let loading = $state(false);
	let value = $state("");
	let error = $state<string | null>(null);
	let suggestions = $state<ChannelSuggestion[]>([]);

	const suggest = debounce(search, 300);

	$effect(() => suggest(value));

	function reset() {
		value = "";
		error = null;
		suggestions = [];
	}

	async function search(query: string) {
		error = null;
		suggestions = [];

		if (!query) return;

		const { searchSuggestions } = await app.twitch.gql(searchSuggestionsQuery, { query });

		for (const edge of searchSuggestions?.edges ?? []) {
			if (edge.node.content?.__typename !== "SearchSuggestionChannel") {
				continue;
			}

			suggestions.push(edge.node.content);
		}
	}

	async function join() {
		if (loading || !value.trim()) return;
		value = value.toLowerCase();

		try {
			loading = true;

			let channel = app.channels.getByLogin(value);

			if (!channel) {
				channel = await app.channels.fetch(value, { by: "login" });
				channel.ephemeral = true;

				app.channels.set(channel.id, channel);
			}

			await app.open(channel);

			reset();
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = "An unknown error occurred.";
			}
		} finally {
			loading = false;
		}
	}
</script>

<Dialog id="join-dialog">
	{#snippet header()}
		<h2>Join a channel</h2>

		<p>
			This channel will only last during the current session. Qutting the application will
			automatically leave the channel and remove it from the channel list.
		</p>
	{/snippet}

	<Combobox.Root
		type="single"
		loop
		onValueChange={async (v) => {
			if (loading) return;
			value = v;
			await tick();
			await join();
		}}
	>
		<Field.Field data-invalid={error != null}>
			<Field.Label for="name">Channel name</Field.Label>

			<Combobox.Input id="name">
				{#snippet child({ props })}
					<Input
						autocapitalize="off"
						autocorrect="off"
						placeholder="Search for a channel"
						aria-invalid={error != null}
						bind:value
						{...props}
					/>
				{/snippet}
			</Combobox.Input>

			{#if error}
				<Field.Error class="text-xs text-destructive">{error}</Field.Error>
			{/if}
		</Field.Field>

		{#if suggestions.length}
			<Combobox.Content
				class="flex max-h-72 w-(--bits-combobox-anchor-width) flex-col overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground"
				side="bottom"
				sideOffset={8}
			>
				{#each suggestions as channel (channel.id)}
					{@const { displayName } = channel.user!}

					<Combobox.Item
						class="relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
						value={displayName}
					>
						<img
							class="size-6 rounded-full"
							src={channel.profileImageURL}
							alt={displayName}
						/>

						<div class="flex w-full items-center justify-between">
							<span class="text-sm">{displayName}</span>

							{#if channel.isLive}
								<div class="flex items-center text-red-500">
									<div
										class="mr-1.5 size-2 animate-pulse rounded-full bg-current"
									></div>

									<span class="text-sm font-medium">Live</span>
								</div>
							{/if}
						</div>
					</Combobox.Item>
				{/each}
			</Combobox.Content>
		{/if}
	</Combobox.Root>

	{#snippet footer()}
		<Button disabled={loading} onclickwait={join}>
			<Spinner class="hidden animate-spin group-data-[loading=true]:inline" />

			<span>
				Join<span class="hidden group-data-[loading=true]:inline">ing</span>
			</span>
		</Button>
	{/snippet}
</Dialog>
