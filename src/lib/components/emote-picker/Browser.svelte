<script lang="ts">
	import { onDestroy, tick } from "svelte";

	import type { EmoteSet } from "#lib/emotes.js";

	import * as Accordion from "../ui/accordion";
	import Avatar from "../ui/Avatar.svelte";
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
		class="emote-sets min-w-0 flex-1 overflow-y-auto overscroll-none border-l border-line"
		multiple
		bind:value={open}
	>
		{#each sets as set (set.id)}
			<div class="emote-set" id={set.id} {@attach observe}>
				<Accordion.Item value={set.id}>
					<Accordion.Trigger class="h-9" headerClass="sticky top-0 z-10">
						<Avatar
							class="size-5 object-contain"
							src={set.owner.avatarUrl}
							alt=""
							decoding="async"
							loading="lazy"
						/>

						<span class="truncate">{set.name}</span>
					</Accordion.Trigger>

					<Accordion.Panel class="grid grid-cols-9 gap-1.5">
						<EmoteGrid emotes={set.emotes} {onpick} />
					</Accordion.Panel>
				</Accordion.Item>
			</div>
		{/each}
	</Accordion.Root>
</div>
