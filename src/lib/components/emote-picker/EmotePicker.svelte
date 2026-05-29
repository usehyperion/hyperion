<script lang="ts">
	import { Accordion, Popover } from "bits-ui";
	import { onDestroy, tick } from "svelte";
	import { app } from "$lib/app.svelte";
	import type { EmoteSet } from "$lib/emotes";
	import type { Channel } from "$lib/models/channel.svelte";
	import CaretRight from "~icons/ph/caret-right";
	import Smiley from "~icons/ph/smiley";
	import SmileySad from "~icons/ph/smiley-sad";
	import { Input } from "../ui/input";
	import * as InputGroup from "../ui/input-group";
	import EmoteGrid from "./EmoteGrid.svelte";
	import ProviderRail from "./ProviderRail.svelte";

	interface Props {
		channel: Channel;
	}

	const { channel }: Props = $props();

	let query = $state("");
	let activeSet = $state("");

	const sorted = $derived.by<EmoteSet[]>(() => {
		const sets = new Map<string, EmoteSet>();

		for (const set of app.emoteSets.values()) {
			if (set.global) sets.set(set.id, set);
		}

		app.user?.emoteSets.forEach((set) => sets.set(set.id, set));

		for (const provider of ["7TV", "BetterTTV", "FrankerFaceZ"] as const) {
			const emotes = channel.emotes
				.values()
				.filter((emote) => emote.provider === provider)
				.toArray();

			if (!emotes.length) continue;

			const id = `${provider}:${channel.id}`;

			sets.set(id, {
				id,
				name: `${channel.user.displayName}: ${provider}`,
				owner: channel.user,
				global: false,
				emotes,
			});
		}

		return sets
			.values()
			.toArray()
			.toSorted((a, b) => {
				// Priority: channel specific > channel owned > global
				const pA = a.owner.id === channel.id ? 0 : a.global ? 2 : 1;
				const pB = b.owner.id === channel.id ? 0 : b.global ? 2 : 1;

				return pA !== pB ? pA - pB : a.name.localeCompare(b.name);
			});
	});

	let open = $derived(sorted.filter((set) => set.owner.id === channel.id).map((set) => set.id));

	const results = $derived.by(() => {
		if (!query) return [];

		const needle = query.toLowerCase();

		return sorted
			.flatMap((set) => set.emotes)
			.filter((emote) => emote.name.toLowerCase().includes(needle));
	});

	const visibleSets = new Set<string>();

	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				visibleSets.add(entry.target.id);
			} else {
				visibleSets.delete(entry.target.id);
			}
		}

		for (const set of sorted) {
			if (visibleSets.has(set.id)) {
				activeSet = set.id;
				break;
			}
		}
	});

	onDestroy(() => observer.disconnect());

	function observe(element: HTMLElement) {
		observer.observe(element);

		return () => observer.unobserve(element);
	}

	function appendEmote(name: string) {
		if (!channel.chat.input) return;

		if (channel.chat.value.length > 0) {
			channel.chat.value += ` ${name}`;
		} else {
			channel.chat.value = name;
		}
	}

	async function scrollToSet(id: string) {
		if (!open.includes(id)) {
			open = [...open, id];
			await tick();
		}

		document.getElementById(id)?.scrollIntoView();
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
			class="flex max-h-100 overflow-hidden rounded-md border bg-sidebar"
			side="top"
			sideOffset={12}
			collisionPadding={8}
		>
			<ProviderRail sets={sorted} activeId={activeSet} onselect={scrollToSet} />

			<div class="flex w-md flex-col border-l">
				<Input
					class="shrink-0 rounded-none rounded-tr-md border-0 border-b focus-visible:ring-0"
					type="search"
					placeholder="Search..."
					bind:value={query}
				/>

				{#if query}
					{#if results.length}
						<div class="grid grid-cols-9 content-start gap-1.5 overflow-y-auto p-2">
							<EmoteGrid emotes={results} onpick={appendEmote} />
						</div>
					{:else}
						<div
							class="flex h-full flex-col items-center justify-center p-4 text-center text-sm text-muted-foreground"
						>
							<SmileySad class="mb-2 size-6" />
							No emotes found.
						</div>
					{/if}
				{:else}
					<Accordion.Root
						class="divide-y overflow-y-auto overscroll-none"
						type="multiple"
						bind:value={open}
					>
						{#each sorted as set (set.id)}
							<Accordion.Item
								id={set.id}
								class="group flex flex-col"
								value={set.id}
								{@attach observe}
							>
								<Accordion.Header class="sticky top-0 z-10 bg-sidebar p-2">
									<Accordion.Trigger
										class="group flex w-full items-center justify-between"
									>
										<div class="flex items-center">
											<img
												class="mr-2 size-5 rounded-full object-contain"
												src={set.owner.avatarUrl}
												alt={set.owner.displayName}
												decoding="async"
												loading="lazy"
											/>

											<span class="text-sm font-medium">{set.name}</span>
										</div>

										<CaretRight
											class="text-muted-foreground group-data-[state=open]:rotate-90"
										/>
									</Accordion.Trigger>
								</Accordion.Header>

								{#if open.includes(set.id)}
									<Accordion.Content class="grid grid-cols-9 gap-1.5 px-2 pb-2">
										<EmoteGrid emotes={set.emotes} onpick={appendEmote} />
									</Accordion.Content>
								{/if}
							</Accordion.Item>
						{/each}
					</Accordion.Root>
				{/if}
			</div>
		</Popover.Content>
	</Popover.Portal>
</Popover.Root>
