<script lang="ts">
	import { Pane, PaneGroup, PaneResizer } from "paneforge";
	import type { SplitNode } from "$lib/split-layout";
	import Self from "./SplitNode.svelte";
	import SplitView from "./SplitView.svelte";

	interface Props {
		node: SplitNode;
	}

	let { node = $bindable() }: Props = $props();
</script>

{#if typeof node === "string"}
	<SplitView id={node} />
{:else}
	<PaneGroup class="size-full" direction={node.axis}>
		<Pane defaultSize={node.size ?? 50} onResize={(size) => (node.size = size)}>
			<Self bind:node={node.before} />
		</Pane>

		<PaneResizer
			class={[
				"bg-muted relative flex items-center justify-center transition-colors hover:bg-blue-400",
				node.axis === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
			]}
		/>

		<Pane defaultSize={100 - (node.size ?? 50)} onResize={(size) => (node.size = 100 - size)}>
			<Self bind:node={node.after} />
		</Pane>
	</PaneGroup>
{/if}
