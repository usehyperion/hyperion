<script lang="ts" generics="T">
	import { tick } from "svelte";
	import type { Snippet } from "svelte";
	import { fly } from "svelte/transition";
	import { VList } from "virtua/svelte";

	import ArrowDown from "~icons/ph/arrow-down";

	import { log } from "#lib/log.js";

	interface OlderItems {
		readonly hasOlder: boolean;
		loadOlder(): Promise<unknown>;
	}

	interface Props {
		class?: string;
		data: T[];
		scrollbar?: boolean;

		/**
		 * Labels the number of items added while scrolled up. A button to jump
		 * to the end is only shown when given.
		 */
		jumpLabel?: (count: number) => string;

		/**
		 * Where older items are loaded from when scrolled near the top.
		 */
		older?: OlderItems;
		getKey: (item: T, index: number) => string | number;
		children: Snippet<[item: T, index: number]>;
	}

	// Arbitrary; corresponds to how much of the bottom of the list needs to be
	// visible (smaller = more, larger = less).
	const TOLERANCE = 15;

	const LOAD_THRESHOLD = 200;

	const {
		class: className,
		data,
		scrollbar = true,
		jumpLabel,
		older,
		getKey,
		children,
	}: Props = $props();

	let list = $state<VList<T>>();
	let scrollingPaused = $state(false);
	let lastSeen = $state.raw<T>();
	let countSnapshot = $state(0);
	let shifting = $state(false);

	let loading = false;

	const observer = new ResizeObserver(() => {
		if (!scrollingPaused) scrollToEnd();
	});

	const newCount = $derived.by(() => {
		if (!scrollingPaused) return 0;

		// Counted from the last item seen when older items can be loaded so
		// that they aren't counted as new. Otherwise, the length is compared
		// so that items moved to the end aren't miscounted.
		return older ? data.length - 1 - data.lastIndexOf(lastSeen!) : data.length - countSnapshot;
	});

	const hasNew = $derived(newCount > 0);

	$effect(() => {
		if (data.length && !scrollingPaused) {
			scrollToEnd();
		}
	});

	function scrollToEnd() {
		list?.scrollToIndex(data.length - 1, { align: "end" });
	}

	function handleScroll(offset: number) {
		if (!list) return;

		const atBottom = offset >= list.getScrollSize() - list.getViewportSize() - TOLERANCE;

		if (!atBottom && !scrollingPaused) {
			lastSeen = data.at(-1);
			countSnapshot = data.length;
		}

		scrollingPaused = !atBottom;

		if (older?.hasOlder && offset < LOAD_THRESHOLD) {
			void loadMore();
		}
	}

	async function loadMore() {
		if (loading || !older) return;

		loading = true;
		shifting = true;

		try {
			await older.loadOlder();

			// Keep the current items in place as older ones are prepended.
			await tick();
		} catch (error) {
			log.error(`Failed to load older items: ${String(error)}`);
		} finally {
			shifting = false;
			loading = false;
		}
	}
</script>

<div
	class="reverse-scroll group/scroll relative h-full"
	data-scrollbar={scrollbar}
	{@attach (element) => {
		observer.observe(element);

		return () => observer.disconnect();
	}}
>
	{#if jumpLabel && scrollingPaused}
		<div class="absolute inset-x-0 bottom-4 z-10 flex justify-center">
			<button
				class={[
					"flex items-center rounded-full border bg-orange-500/40 p-1.5 text-xs font-medium shadow-sm backdrop-blur-lg transition-[background-color,padding] duration-200 ease-out hover:bg-orange-500/60",
					hasNew && "pr-3",
				]}
				type="button"
				onclick={scrollToEnd}
				transition:fly={{ y: 16, duration: 200 }}
			>
				<ArrowDown class="size-4 shrink-0" />

				<span
					class="grid overflow-hidden transition-[grid-template-columns] duration-200 ease-out"
					style:grid-template-columns={hasNew ? "minmax(0, 1fr)" : "minmax(0, 0fr)"}
				>
					<span class="overflow-hidden pl-1.5 whitespace-nowrap">
						{jumpLabel(newCount)}
					</span>
				</span>
			</button>
		</div>
	{/if}

	<VList
		class="{className} scroll-fade overflow-y-auto group-data-[scrollbar=false]/scroll:[&::-webkit-scrollbar]:hidden"
		{data}
		shift={shifting}
		{getKey}
		{children}
		onscroll={handleScroll}
		bind:this={list}
	/>
</div>
