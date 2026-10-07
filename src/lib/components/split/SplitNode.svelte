<script lang="ts">
	import { Pane, PaneGroup, PaneResizer } from "paneforge";

	import type { SplitNode } from "#lib/splits/types.js";

	import { app } from "#lib/app.svelte.js";
	import { isLeaf } from "#lib/splits/tree.js";

	import Self from "./SplitNode.svelte";
	import SplitView from "./SplitView.svelte";

	interface Props {
		node: SplitNode;
	}

	const { node }: Props = $props();
</script>

{#if isLeaf(node)}
	<SplitView pane={node} />
{:else}
	<PaneGroup
		class="size-full"
		data-component="split-node"
		direction={node.axis}
		onLayoutChange={(layout) => app.splits.resize(node.id, layout)}
	>
		<Pane data-slot="split-node-pane" defaultSize={node.before.size} minSize={10}>
			<Self node={node.before} />
		</Pane>

		<PaneResizer
			class={[
				"relative flex items-center justify-center bg-muted transition-colors hover:bg-blue-400",
				node.axis === "horizontal" ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
			]}
			data-slot="split-node-resizer"
		/>

		<Pane data-slot="split-node-pane" defaultSize={node.after.size} minSize={10}>
			<Self node={node.after} />
		</Pane>
	</PaneGroup>
{/if}
