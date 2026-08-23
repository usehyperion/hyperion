<script lang="ts" module>
	export interface TooltipOptions {
		class?: string;
		side?: "top" | "right" | "bottom" | "left";
		align?: "center" | "start" | "end";
		delay?: number;
	}

	interface TooltipEntry extends TooltipOptions {
		content: Snippet;
	}

	export const registry = new WeakMap<Element, TooltipEntry>();
	export const detached = new Set<(node: Element) => void>();
</script>

<script lang="ts">
	import { onMount, type Snippet } from "svelte";
	import { cn } from "tailwind-variants";

	interface ResolvedTooltip {
		trigger: HTMLElement;
		entry: TooltipEntry;
	}

	interface AnchorRect {
		top: number;
		left: number;
		width: number;
		height: number;
	}

	const DEFAULT_DELAY = 300;
	const ANCHOR = "--tooltip-active";

	const LIVENESS_INTERVAL = 200;

	let element = $state<HTMLElement | null>(null);
	let trigger = $state<HTMLElement | null>(null);
	let entry = $state<TooltipEntry | null>(null);
	let rect = $state<AnchorRect | null>(null);
	let open = $state(false);

	let timer: ReturnType<typeof setTimeout>;
	let liveness: ReturnType<typeof setInterval>;

	onMount(() => {
		const unsubscribe = onTooltipDetach((node) => {
			if (node === trigger) hide();
		});

		return () => {
			unsubscribe();

			clearTimeout(timer);
			clearInterval(liveness);
		};
	});

	$effect(() => {
		if (!element) return;

		const shown = element.matches(":popover-open");

		if (open && entry) {
			if (!shown) element.showPopover();
		} else if (shown) {
			element.hidePopover();
		}
	});

	function pointerover(event: PointerEvent) {
		if (!(event.target instanceof Element)) return;

		const resolved = resolveTooltip(event.target);

		if (resolved) {
			show(resolved.trigger, resolved.entry);
		} else {
			hide();
		}
	}

	function measure(node: HTMLElement): AnchorRect {
		const { top, left, width, height } = node.getBoundingClientRect();

		return {
			top,
			left,
			width,
			height,
		};
	}

	function changed(a: AnchorRect, b: AnchorRect) {
		return a.top !== b.top || a.left !== b.left || a.width !== b.width || a.height !== b.height;
	}

	function show(node: HTMLElement, found: TooltipEntry) {
		if (node === trigger) return;

		hide();

		trigger = node;
		entry = found;
		rect = measure(node);

		liveness = setInterval(() => {
			if (!trigger?.isConnected) {
				hide();
				return;
			}

			const next = measure(trigger);

			if (!rect || changed(rect, next)) {
				rect = next;
			}
		}, LIVENESS_INTERVAL);

		timer = setTimeout(() => {
			open = true;
		}, found.delay ?? DEFAULT_DELAY);
	}

	function hide() {
		clearTimeout(timer);
		clearInterval(liveness);

		open = false;
		trigger = null;
		entry = null;
		rect = null;
	}

	function resolveTooltip(node: Element): ResolvedTooltip | null {
		for (let current: Element | null = node; current; current = current.parentElement) {
			const entry = registry.get(current);

			if (entry && current instanceof HTMLElement) {
				return { trigger: current, entry };
			}
		}

		return null;
	}

	function onTooltipDetach(listener: (node: Element) => void) {
		detached.add(listener);
		return () => detached.delete(listener);
	}
</script>

<svelte:document onpointerover={pointerover} onpointerleave={hide} />

{#if rect}
	<div
		class="pointer-events-none fixed"
		aria-hidden="true"
		style:anchor-name={ANCHOR}
		style:top="{rect.top}px"
		style:left="{rect.left}px"
		style:width="{rect.width}px"
		style:height="{rect.height}px"
	></div>
{/if}

<div
	class={cn(
		"pointer-events-none z-50 w-max rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-primary",
		"opacity-0 smooth-shadow-ring-md transition-[opacity,overlay,display] transition-discrete",
		entry?.class,
	)}
	role="tooltip"
	popover="manual"
	data-component="tooltip-layer"
	data-anchored
	data-arrow
	data-side={entry?.side ?? "top"}
	data-align={entry?.align ?? "center"}
	style:--anchor={ANCHOR}
	style:--anchor-self="--tooltip-active-self"
	bind:this={element}
>
	{#if entry}
		{#if typeof entry.content === "string"}
			{entry.content}
		{:else}
			{@render entry.content()}
		{/if}
	{/if}
</div>

<style>
	[data-component="tooltip-layer"]:popover-open {
		opacity: 1;

		@starting-style {
			opacity: 0;
		}
	}
</style>
