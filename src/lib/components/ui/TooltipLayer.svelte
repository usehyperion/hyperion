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

	const DEFAULT_DELAY = 300;
	const ANCHOR = "--tooltip-active";

	const LIVENESS_INTERVAL = 200;

	let element = $state<HTMLElement | null>(null);
	let trigger = $state<HTMLElement | null>(null);
	let entry = $state<TooltipEntry | null>(null);
	let open = $state(false);

	let timer: ReturnType<typeof setTimeout>;
	let liveness: ReturnType<typeof setInterval>;

	onMount(() => {
		function pointerover(event: PointerEvent) {
			if (!(event.target instanceof Element)) return;

			const resolved = resolveTooltip(event.target);

			if (resolved) {
				show(resolved.trigger, resolved.entry);
			} else {
				hide();
			}
		}

		const unsubscribe = onTooltipDetach((node) => {
			if (node === trigger) hide();
		});

		document.addEventListener("pointerover", pointerover);
		document.addEventListener("pointerleave", hide);

		return () => {
			unsubscribe();

			document.removeEventListener("pointerover", pointerover);
			document.removeEventListener("pointerleave", hide);

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

	function show(node: HTMLElement, found: TooltipEntry) {
		if (node === trigger) return;

		hide();

		trigger = node;
		entry = found;

		node.style.setProperty("anchor-name", ANCHOR);

		liveness = setInterval(() => {
			if (!trigger?.isConnected) hide();
		}, LIVENESS_INTERVAL);

		timer = setTimeout(() => (open = true), found.delay ?? DEFAULT_DELAY);
	}

	function hide() {
		clearTimeout(timer);
		clearInterval(liveness);

		open = false;
		trigger?.style.removeProperty("anchor-name");
		trigger = null;
		entry = null;
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
