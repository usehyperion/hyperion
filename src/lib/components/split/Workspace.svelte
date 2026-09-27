<script lang="ts">
	import "@danfessler/trellis/style.css";
	import { Portal } from "bits-ui";
	import { untrack, type Snippet } from "svelte";

	import { app } from "$lib/app.svelte";

	import SplitView from "./SplitView.svelte";

	interface Props {
		/**
		 * Shown when the layout has no splits.
		 */
		empty: Snippet;
	}

	const { empty }: Props = $props();

	const workspace = $derived(app.splits.workspace);
	const target = $derived(app.splits.dropTarget);

	function attach(node: HTMLElement) {
		// The workspace owns the layout from here on, so don't recreate it when
		// the layout it started from changes
		return untrack(() => app.splits.attach(node));
	}
</script>

<div class="size-full" {@attach attach}></div>

{#if workspace}
	{#each app.splits.surfaces as surface (surface.view.id)}
		<SplitView {surface} />
	{/each}

	<Portal to={workspace.slots.empty}>
		<div class="size-full">
			{@render empty()}
		</div>
	</Portal>

	{#if target}
		<Portal to={workspace.slots.chrome}>
			<!-- Chrome children receive pointer events by default -->
			<div
				class="absolute rounded-(--trellis-radius) bg-primary/50 brightness-50 transition-[top,left,width,height] duration-75 ease-out"
				style:pointer-events="none"
				style:left="{target.rect.x}px"
				style:top="{target.rect.y}px"
				style:width="{target.rect.width}px"
				style:height="{target.rect.height}px"
			></div>
		</Portal>
	{/if}
{/if}
