<script lang="ts">
	import { onMount } from "svelte";

	const DELAY = 300;
	const ANCHOR = "--tooltip-active";

	let trigger = $state<HTMLElement | null>(null);
	let open = $state(false);

	let timer: ReturnType<typeof setTimeout>;

	const text = $derived(trigger?.dataset.tooltip);
	const compact = $derived(trigger?.dataset.tooltipCompact !== undefined);
	const side = $derived(trigger?.dataset.tooltipSide ?? "top");

	const emote = $derived.by(() => {
		if (trigger?.dataset.tooltipEmote === undefined) return null;

		const image = trigger.querySelector("img");
		if (!image) return null;

		return {
			srcset: image.srcset,
			name: image.alt,
			width: Number(trigger.dataset.tooltipWidth) || null,
			height: Number(trigger.dataset.tooltipHeight) || null,
		};
	});

	function show(next: HTMLElement) {
		if (next === trigger) return;

		hide();
		trigger = next;

		next.style.setProperty("anchor-name", ANCHOR);
		timer = setTimeout(() => (open = true), DELAY);
	}

	function hide() {
		clearTimeout(timer);

		open = false;
		trigger?.style.removeProperty("anchor-name");
		trigger = null;
	}

	onMount(() => {
		function pointerover(event: PointerEvent) {
			if (!(event.target instanceof Element)) return;

			const next = event.target.closest<HTMLElement>("[data-tooltip], [data-tooltip-emote]");

			if (next) {
				show(next);
			} else {
				hide();
			}
		}

		document.addEventListener("pointerover", pointerover);
		document.addEventListener("pointerleave", hide);

		return () => {
			document.removeEventListener("pointerover", pointerover);
			document.removeEventListener("pointerleave", hide);

			clearTimeout(timer);
		};
	});
</script>

{#if text || emote}
	<div
		class={[
			"pointer-events-none z-50 w-max rounded-lg bg-neutral-800 text-xs text-primary",
			"smooth-shadow-ring-md transition-opacity",
			compact ? "p-1" : "px-3 py-1.5",
			open ? "opacity-100" : "opacity-0",
		]}
		role="tooltip"
		data-anchored
		data-arrow
		data-side={side}
		data-align="center"
		style:--anchor={ANCHOR}
		style:--anchor-self="--tooltip-active-self"
	>
		{#if emote}
			<div class="flex flex-col items-center">
				<img
					srcset={emote.srcset}
					alt={emote.name}
					width={emote.width}
					height={emote.height}
					decoding="async"
				/>

				{emote.name}
			</div>
		{:else}
			{text}
		{/if}
	</div>
{/if}
