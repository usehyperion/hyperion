import {
	LAYOUT_VERSION,
	type Layout,
	type Pane,
	type SplitAxis,
	type SplitDirection,
	type SplitEdge,
	type SplitNode,
	type Tab,
} from "./types";

const EDGE_DIRECTION: Record<SplitEdge, SplitDirection> = {
	top: "up",
	bottom: "down",
	left: "left",
	right: "right",
};

function uid(type: string) {
	return `${type}-${crypto.randomUUID()}`;
}

export function isLeaf(node: SplitNode): node is Pane {
	return node.type === "pane";
}

/**
 * Normalizes a tab into a plain entry of its own, leaving `ephemeral` off
 * entirely when it doesn't apply so it stays out of the persisted layout.
 */
export function createTab({ id, ephemeral }: Tab): Tab {
	return ephemeral ? { id, ephemeral: true } : { id };
}

export function createPane(tabs: Tab[] = [], size = 100): Pane {
	return {
		type: "pane",
		id: uid("pane"),
		size,
		tabs: tabs.map(createTab),
		active: tabs.at(-1)?.id ?? null,
	};
}

export function firstLeaf(node: SplitNode): Pane {
	return isLeaf(node) ? node : firstLeaf(node.before);
}

export function findLeaf(node: SplitNode, predicate: (pane: Pane) => boolean): Pane | null {
	if (isLeaf(node)) {
		return predicate(node) ? node : null;
	}

	return findLeaf(node.before, predicate) ?? findLeaf(node.after, predicate);
}

export function edgeToDirection(edge: SplitEdge): SplitDirection {
	return EDGE_DIRECTION[edge];
}

function directionAxis(direction: SplitDirection): SplitAxis {
	return direction === "left" || direction === "right" ? "horizontal" : "vertical";
}

/**
 * Replaces the pane `paneId` with a split of it and `newPane`, placing the new
 * pane on the side given by `direction`. The two children share the original
 * pane's slot evenly.
 */
export function splitLeaf(
	root: SplitNode,
	paneId: string,
	direction: SplitDirection,
	newPane: Pane,
): SplitNode {
	const insertBefore = direction === "left" || direction === "up";

	const transform = (node: SplitNode): SplitNode => {
		if (isLeaf(node)) {
			if (node.id !== paneId) return node;

			const existing = { ...node, size: 50 };
			const added = { ...newPane, size: 50 };

			return {
				type: "split",
				id: uid("split"),
				size: node.size,
				axis: directionAxis(direction),
				before: insertBefore ? added : existing,
				after: insertBefore ? existing : added,
			};
		}

		return {
			...node,
			before: transform(node.before),
			after: transform(node.after),
		};
	};

	return transform(root);
}

/**
 * Removes every tab matching `predicate`, closing any pane the removal leaves
 * empty and collapsing its parent split. Panes that were already empty are
 * kept.
 */
function removeTabs(root: SplitNode, predicate: (tab: Tab) => boolean): SplitNode | null {
	if (isLeaf(root)) {
		const tabs = root.tabs.filter((tab) => !predicate(tab));

		if (tabs.length === root.tabs.length) return root;
		if (!tabs.length) return null;

		let active = root.active;

		if (!tabs.some((tab) => tab.id === active)) {
			const index = root.tabs.findIndex((tab) => tab.id === active);
			const next = root.tabs.slice(index + 1).find((tab) => tabs.includes(tab));

			active = (next ?? tabs.at(-1))?.id ?? null;
		}

		return { ...root, tabs, active };
	}

	const before = removeTabs(root.before, predicate);
	const after = removeTabs(root.after, predicate);

	if (!before) {
		return after && { ...after, size: root.size };
	}

	if (!after) {
		return { ...before, size: root.size };
	}

	return { ...root, before, after };
}

/**
 * Removes the pane `paneId`, collapsing its parent split so the sibling takes
 * the split's slot.
 */
export function removeLeaf(root: SplitNode, paneId: string): SplitNode | null {
	if (isLeaf(root)) {
		return root.id === paneId ? null : root;
	}

	const transform = (node: SplitNode): SplitNode => {
		if (isLeaf(node)) return node;

		if (isLeaf(node.before) && node.before.id === paneId) {
			return { ...node.after, size: node.size };
		}

		if (isLeaf(node.after) && node.after.id === paneId) {
			return { ...node.before, size: node.size };
		}

		return {
			...node,
			before: transform(node.before),
			after: transform(node.after),
		};
	};

	return transform(root);
}

export function restoreLayout(layout: Layout | null): Layout | null {
	if (layout?.version !== LAYOUT_VERSION || !layout.root) return null;

	const root = removeTabs(layout.root, (tab) => !!tab.ephemeral);
	return root ? { ...layout, root } : null;
}
