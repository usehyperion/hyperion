<script lang="ts">
	import { Accordion } from "bits-ui";
	import { onDestroy, tick } from "svelte";
	import type { EmoteSet } from "$lib/emotes";
	import CaretRight from "~icons/ph/caret-right";
	import EmoteGrid from "./EmoteGrid.svelte";
	import ProviderRail from "./ProviderRail.svelte";

	interface Props {
		sets: EmoteSet[];
		channelId: string;
		onpick: (name: string) => void;
	}

	const { sets, channelId, onpick }: Props = $props();

	let activeSet = $state("");

	let open = $derived(sets.filter((set) => set.owner.id === channelId).map((set) => set.id));

	const visibleSets = new Set<string>();

	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				visibleSets.add(entry.target.id);
			} else {
				visibleSets.delete(entry.target.id);
			}
		}

		for (const set of sets) {
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

	async function scrollToSet(id: string) {
		if (!open.includes(id)) {
			open = [...open, id];
			await tick();
		}

		document.getElementById(id)?.scrollIntoView();
	}
</script>

<div class="flex min-h-0 flex-1">
	<ProviderRail {sets} activeId={activeSet} onselect={scrollToSet} />

	<Accordion.Root
		class="min-w-0 flex-1 divide-y overflow-y-auto overscroll-none border-l"
		type="multiple"
		bind:value={open}
	>
		{#each sets as set (set.id)}
			<Accordion.Item
				id={set.id}
				class="group flex flex-col"
				value={set.id}
				{@attach observe}
			>
				<Accordion.Header class="sticky top-0 z-10 bg-sidebar p-2">
					<Accordion.Trigger class="group flex w-full items-center justify-between">
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
						<EmoteGrid emotes={set.emotes} {onpick} />
					</Accordion.Content>
				{/if}
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</div>
