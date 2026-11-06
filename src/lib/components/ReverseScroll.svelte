<script lang="ts" generics="T">
	import { tick } from "svelte";
	import type { Snippet } from "svelte";
	import { fly } from "svelte/transition";
	import { VList } from "virtua/svelte";

	import ArrowDown from "~icons/ph/arrow-down";

	import { settings } from "#lib/settings/index.js";

	interface Props {
		class?: string;
		data: T[];
		showJumpButton?: boolean;

		/**
		 * The total number of items received, used to count new items while
		 * paused. Defaults to the length of {@linkcode data}, but should be
		 * provided if items can be removed from the list.
		 */
		total?: number;

		/**
		 * Whether scrolling is paused because the list isn't scrolled to the
		 * bottom.
		 */
		paused?: boolean;

		/**
		 * Whether older items should be loaded with {@linkcode onloadmore} when
		 * scrolled near the top.
		 */
		lazy?: boolean;
		getKey: (item: T, index: number) => string | number;
		onloadmore?: () => Promise<unknown>;
		children: Snippet<[item: T, index: number]>;
	}

	// Arbitrary; corresponds to how much of the bottom of the list needs to be
	// visible (smaller = more, larger = less).
	const TOLERANCE = 15;

	// Distance from the top of the list at which older items start loading.
	const LOAD_THRESHOLD = 200;

	let {
		class: className,
		data,
		showJumpButton = true,
		total,
		paused = $bindable(false),
		lazy = false,
		getKey,
		onloadmore,
		children,
	}: Props = $props();

	let list = $state<VList<T>>();
	let lastSeen = $state.raw<T>();
	let countSnapshot = $state(0);
	let shifting = $state(false);

	let loading = false;

	const observer = new ResizeObserver(() => {
		if (!paused) scrollToEnd();
	});

	const received = $derived(total ?? data.length);

	const newCount = $derived.by(() => {
		if (!paused) return 0;

		// Counted from the last item seen when older items can be loaded so
		// that they aren't counted as new. Otherwise, the length is compared
		// so that items moved to the end aren't miscounted.
		return onloadmore
			? data.length - 1 - data.lastIndexOf(lastSeen!)
			: received - countSnapshot;
	});

	const hasNew = $derived(newCount > 0);

	$effect(() => {
		if (data.length && !paused) {
			scrollToEnd();
		}
	});

	function scrollToEnd() {
		list?.scrollToIndex(data.length - 1, { align: "end" });
	}

	function handleScroll(offset: number) {
		if (!list) return;

		const atBottom = offset >= list.getScrollSize() - list.getViewportSize() - TOLERANCE;

		if (!atBottom && !paused) {
			lastSeen = data.at(-1);
			countSnapshot = received;
		}

		paused = !atBottom;

		if (lazy && offset < LOAD_THRESHOLD) {
			void loadMore();
		}
	}

	async function loadMore() {
		if (loading || !onloadmore) return;

		loading = true;
		shifting = true;

		try {
			await onloadmore();

			// Keep the current items in place as older ones are prepended.
			await tick();
		} finally {
			shifting = false;
			loading = false;
		}
	}
</script>

<div
	class="reverse-scroll group/scroll relative h-full"
	data-scrollbar={!settings.state["chat.hideScrollbar"]}
	{@attach (element) => {
		observer.observe(element);

		return () => observer.disconnect();
	}}
>
	{#if showJumpButton && paused}
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
						{newCount} new {newCount === 1 ? "message" : "messages"}
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
