import type { Pane, SplitAxis, SplitDirection, SplitEdge, SplitNode } from "./types";

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

export function createPane(tabs: string[] = [], size = 100): Pane {
	return {
		type: "pane",
		id: uid("pane"),
		size,
		tabs,
		active: tabs.at(-1) ?? null,
	};
}

export function firstLeaf(node: SplitNode): Pane {
	return isLeaf(node) ? node : firstLeaf(node.before);
}

export function leaves(node: SplitNode | null): Pane[] {
	if (!node) return [];
	if (isLeaf(node)) return [node];

	return [...leaves(node.before), ...leaves(node.after)];
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

export function directionAxis(direction: SplitDirection): SplitAxis {
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
