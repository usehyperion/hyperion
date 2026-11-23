<script lang="ts">
	import type { Emote, EmoteProvider, EmoteSet } from "#lib/emotes.js";
	import type { Channel } from "#lib/models/channel.svelte.js";

	import { app } from "#lib/app.svelte.js";
	import { PROVIDER_ICONS, THIRD_PARTY_PROVIDERS, toProviderSets } from "#lib/emotes.js";
	import { IconEmotes, IconSearch } from "#lib/icons.js";

	import Button from "../ui/Button.svelte";
	import InputGroup from "../ui/InputGroup.svelte";
	import Popover from "../ui/Popover.svelte";
	import * as Tabs from "../ui/tabs";
	import Browser from "./Browser.svelte";
	import Results from "./Results.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const TABS = (["Twitch", ...THIRD_PARTY_PROVIDERS.map((p) => p.id)] as const).map(
		(provider) => ({
			provider,
			icon: PROVIDER_ICONS[provider],
		}),
	);

	let query = $state("");
	let activeProvider = $state<EmoteProvider>("Twitch");

	const providerSets = $derived.by(() => {
		const sets = [
			...toProviderSets(channel.emotes.values(), (provider) => ({
				id: `${provider.id}:${channel.id}`,
				name: `${channel.user.displayName}: ${provider.id}`,
				owner: channel.user,
				global: false,
			})),
			...(app.user?.emoteSets.values() ?? []),
			...toProviderSets(app.emotes.values(), ({ global }) => ({
				id: global.owner.id,
				name: global.name,
				owner: global.owner,
				global: true,
			})),
		];

		const grouped: Partial<Record<EmoteProvider, EmoteSet[]>> = {};

		for (const set of sets) {
			(grouped[set.provider] ??= []).push(set);
		}

		grouped.Twitch?.sort((a, b) => a.name.localeCompare(b.name));

		return grouped;
	});

	const activeSets = $derived(providerSets[activeProvider] ?? []);

	const results = $derived.by<Emote[]>(() => {
		if (!query) return [];

		const needle = query.toLowerCase();

		return activeSets
			.flatMap((set) => set.emotes)
			.filter((emote) => emote.displayName.toLowerCase().includes(needle));
	});

	function appendEmote(name: string) {
		if (!channel.chat.input) return;

		if (channel.chat.value.length > 0) {
			channel.chat.value += ` ${name}`;
		} else {
			channel.chat.value = name;
		}
	}
</script>

<Popover
	class="flex h-100 w-120 flex-col overflow-hidden p-0"
	side="top"
	align="end"
	container={document.body}
	aria-label="Emote picker"
>
	{#snippet trigger(props)}
		<Button
			{...props}
			class="[&_svg:not([class*=\'size-\'])]:size-4"
			size="icon"
			variant="ghost"
			disabled={channel.banned}
			aria-label="Toggle emote picker"
		>
			<IconEmotes />
		</Button>
	{/snippet}

	<Tabs.Root
		class="flex min-h-0 flex-1 flex-col gap-0"
		bind:value={
			() => activeProvider,
			(value) => {
				if (value) activeProvider = value as EmoteProvider;
			}
		}
	>
		<div class="flex shrink-0 flex-col gap-2 border-b border-line p-2">
			<Tabs.List aria-label="Emote provider">
				{#each TABS as tab (tab.provider)}
					<Tabs.Tab
						value={tab.provider}
						disabled={!providerSets[tab.provider]?.length}
						aria-label={tab.provider}
						title={tab.provider}
					>
						<tab.icon class="fill-current" aria-hidden="true" />
					</Tabs.Tab>
				{/each}
			</Tabs.List>

			<InputGroup
				type="search"
				clearable
				clearLabel="Clear search"
				placeholder="Search emotes"
				aria-label="Search emotes"
				bind:value={query}
			>
				{#snippet start()}<IconSearch />{/snippet}
			</InputGroup>
		</div>

		{#each TABS as tab (tab.provider)}
			<Tabs.Panel class="flex min-h-0 flex-1 flex-col rounded-none" value={tab.provider}>
				{#if query}
					<Results emotes={results} onpick={appendEmote} />
				{:else}
					<Browser
						sets={providerSets[tab.provider] ?? []}
						channelId={channel.id}
						onpick={appendEmote}
					/>
				{/if}
			</Tabs.Panel>
		{/each}
	</Tabs.Root>
</Popover>
