<script lang="ts">
	import { Popover, Tabs } from "bits-ui";
	import { app } from "$lib/app.svelte";
	import { GLOBAL_PROVIDERS, toProviderSets } from "$lib/emotes";
	import type { Emote, EmoteProvider, EmoteSet } from "$lib/emotes";
	import type { Channel } from "$lib/models/channel.svelte";
	import Smiley from "~icons/ph/smiley";
	import stv from "../../../assets/logos/7tv.svg?raw";
	import bttv from "../../../assets/logos/bttv.svg?raw";
	import ffz from "../../../assets/logos/ffz.svg?raw";
	import twitch from "../../../assets/logos/twitch.svg?raw";
	import { Input } from "../ui/input";
	import * as InputGroup from "../ui/input-group";
	import Browser from "./Browser.svelte";
	import Results from "./Results.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	const TABS = [
		{ provider: "Twitch", icon: twitch },
		{ provider: "7TV", icon: stv },
		{ provider: "BetterTTV", icon: bttv },
		{ provider: "FrankerFaceZ", icon: ffz },
	] as const;

	let query = $state("");
	let activeProvider = $state<EmoteProvider>("Twitch");

	const providerSets = $derived.by(() => {
		const grouped: Partial<Record<EmoteProvider, EmoteSet[]>> = {};

		function add(set: EmoteSet) {
			const existing = grouped[set.provider];

			if (existing) {
				existing.push(set);
			} else {
				grouped[set.provider] = [set];
			}
		}

		const channelSets = toProviderSets(channel.emotes.values(), (provider) => ({
			id: `${provider}:${channel.id}`,
			name: `${channel.user.displayName}: ${provider}`,
			owner: channel.user,
			global: false,
		}));

		const globalSets = toProviderSets(app.emotes.values(), (provider) => {
			const meta = provider === "Twitch" ? null : GLOBAL_PROVIDERS[provider];

			return meta
				? {
						id: meta.owner.id,
						name: meta.name,
						owner: meta.owner,
						global: true,
					}
				: null;
		});

		channelSets.forEach(add);
		app.user?.emoteSets.forEach(add);
		globalSets.forEach(add);

		return grouped;
	});

	const activeSets = $derived(providerSets[activeProvider] ?? []);

	const results = $derived.by<Emote[]>(() => {
		if (!query) return [];

		const needle = query.toLowerCase();

		return activeSets
			.flatMap((set) => set.emotes)
			.filter((emote) => emote.name.toLowerCase().includes(needle));
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

<Popover.Root>
	<Popover.Trigger disabled={app.user?.banned.has(channel.id)} aria-label="Open emote picker">
		{#snippet child({ props })}
			<InputGroup.Button class="size-9" size="icon-sm" {...props}>
				<Smiley />
			</InputGroup.Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Portal>
		<Popover.Content
			class="flex h-100 w-120 flex-col overflow-hidden rounded-md border bg-sidebar"
			side="top"
			sideOffset={12}
			collisionPadding={8}
		>
			<Tabs.Root class="flex min-h-0 flex-1 flex-col" bind:value={activeProvider}>
				<Tabs.List class="flex shrink-0 border-b">
					{#each TABS as tab (tab.provider)}
						<Tabs.Trigger
							class="flex flex-1 justify-center py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 data-[state=active]:bg-accent data-[state=active]:text-foreground"
							value={tab.provider}
							disabled={!providerSets[tab.provider]?.length}
						>
							{@html tab.icon}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>

				<Input
					class="shrink-0 rounded-none border-0 border-b focus-visible:ring-0"
					type="search"
					placeholder="Search..."
					bind:value={query}
				/>

				{#each TABS as tab (tab.provider)}
					<Tabs.Content class="flex min-h-0 flex-1 flex-col" value={tab.provider}>
						{#if query}
							<Results emotes={results} onpick={appendEmote} />
						{:else}
							<Browser
								sets={providerSets[tab.provider] ?? []}
								channelId={channel.id}
								onpick={appendEmote}
							/>
						{/if}
					</Tabs.Content>
				{/each}
			</Tabs.Root>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
