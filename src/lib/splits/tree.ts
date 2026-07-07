import type { Pane, Rect, SplitAxis, SplitDirection, SplitEdge, SplitNode } from "./types";

const DIRECTION_EDGE: Record<SplitDirection, SplitEdge> = {
	up: "top",
	down: "bottom",
	left: "left",
	right: "right",
};

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

export function directionToEdge(direction: SplitDirection): SplitEdge {
	return DIRECTION_EDGE[direction];
}

export function edgeToDirection(edge: SplitEdge): SplitDirection {
	return EDGE_DIRECTION[edge];
}

export function edgeAxis(edge: SplitEdge): SplitAxis {
	return edge === "left" || edge === "right" ? "horizontal" : "vertical";
}

export function edgeInsertsBefore(edge: SplitEdge): boolean {
	return edge === "left" || edge === "top";
}

/**
 * Replaces the pane `paneId` with a split of it and `newPane`, returning the
 * new tree. The two children share the original pane's slot evenly.
 */
export function splitLeaf(
	root: SplitNode,
	paneId: string,
	axis: SplitAxis,
	newPane: Pane,
	insertBefore: boolean,
): SplitNode {
	const transform = (node: SplitNode): SplitNode => {
		if (isLeaf(node)) {
			if (node.id !== paneId) return node;

			const size = node.size;
			node.size = 50;
			newPane.size = 50;

			return {
				type: "split",
				id: uid("split"),
				size,
				axis,
				before: insertBefore ? newPane : node,
				after: insertBefore ? node : newPane,
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
			node.after.size = node.size;
			return node.after;
		}

		if (isLeaf(node.after) && node.after.id === paneId) {
			node.before.size = node.size;
			return node.before;
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
 * Computes the normalized bounds of every pane in the tree.
 */
export function bounds(
	node: SplitNode,
	rect: Omit<Rect, "id"> = { x: 0, y: 0, width: 1, height: 1 },
): Rect[] {
	if (isLeaf(node)) {
		return [{ id: node.id, ...rect }];
	}

	const isRow = node.axis === "horizontal";
	const total = node.before.size + node.after.size;
	const ratio = total > 0 ? node.before.size / total : 0.5;

	const firstSize = (isRow ? rect.width : rect.height) * ratio;

	return [
		...bounds(node.before, {
			x: rect.x,
			y: rect.y,
			width: isRow ? firstSize : rect.width,
			height: isRow ? rect.height : firstSize,
		}),
		...bounds(node.after, {
			x: isRow ? rect.x + firstSize : rect.x,
			y: isRow ? rect.y : rect.y + firstSize,
			width: isRow ? rect.width - firstSize : rect.width,
			height: isRow ? rect.height : rect.height - firstSize,
		}),
	];
}

/**
 * The nearest pane to `startId` in the given direction, by spatial adjacency,
 * preferring the neighbor with the most perpendicular overlap, then the closest.
 */
export function neighbor(rects: Rect[], startId: string, direction: SplitDirection): string | null {
	const current = rects.find((rect) => rect.id === startId);
	if (!current) return null;

	const eps = 0.001;
	const candidates = rects.filter(
		(rect) => rect.id !== startId && isAhead(current, rect, direction, eps),
	);
	if (!candidates.length) return null;

	const vertical = direction === "up" || direction === "down";

	const [best] = candidates.toSorted((a, b) => {
		const delta = overlap(current, b, vertical) - overlap(current, a, vertical);
		if (Math.abs(delta) > eps) return delta;

		return distance(current, a, direction) - distance(current, b, direction);
	});

	return best.id;
}

// oxlint-disable-next-line typescript/consistent-return
function isAhead(from: Rect, to: Rect, direction: SplitDirection, eps: number): boolean {
	switch (direction) {
		case "up":
			return to.y + to.height <= from.y + eps;
		case "down":
			return to.y >= from.y + from.height - eps;
		case "left":
			return to.x + to.width <= from.x + eps;
		case "right":
			return to.x >= from.x + from.width - eps;
	}
}

function overlap(from: Rect, to: Rect, vertical: boolean): number {
	const [start, end, tStart, tEnd] = vertical
		? [from.x, from.x + from.width, to.x, to.x + to.width]
		: [from.y, from.y + from.height, to.y, to.y + to.height];

	return Math.max(0, Math.min(end, tEnd) - Math.max(start, tStart));
}

// oxlint-disable-next-line typescript/consistent-return
function distance(from: Rect, to: Rect, direction: SplitDirection): number {
	switch (direction) {
		case "up":
			return from.y - (to.y + to.height);
		case "down":
			return to.y - (from.y + from.height);
		case "left":
			return from.x - (to.x + to.width);
		case "right":
			return to.x - (from.x + from.width);
	}
}
