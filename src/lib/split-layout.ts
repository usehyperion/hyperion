import type { DragEndEvent } from "@dnd-kit/abstract";
import type { PaneGroupProps } from "paneforge";
import { storage } from "./stores";

export type SplitDirection = "up" | "down" | "left" | "right";
export type SplitDropPosition = SplitDirection | "center";

type SplitAxis = PaneGroupProps["direction"];

export interface SplitBranch {
	axis: SplitAxis;
	size?: number;
	before: SplitNode;
	after: SplitNode;
}

export type SplitNode = SplitBranch | string;

type SplitPath = ("before" | "after")[];

interface SplitRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

type DragSourceData = {
	kind: "channel" | "pane";
	id: string;
};

type DragTargetData = {
	paneId: string;
	position: SplitDropPosition;
};

function isSourceData(data: Record<string, unknown>): data is DragSourceData {
	if (!data || typeof data !== "object") return false;

	return (data.kind === "channel" || data.kind === "pane") && typeof data.id === "string";
}

function isTargetData(data: Record<string, unknown>): data is DragTargetData {
	if (!data || typeof data !== "object") return false;

	return typeof data.paneId === "string" && typeof data.position === "string";
}

export function emptyPaneId() {
	return `split-${crypto.randomUUID()}`;
}

export function isEmptyPaneId(id: string) {
	return id.startsWith("split-");
}

/**
 * Split layout implemented as a binary tree where each node is either a
 * {@linkcode SplitBranch} or a leaf representing a pane ID.
 */
export class SplitLayout {
	#focused: string | null = null;

	public get root() {
		return storage.state.layout;
	}

	public set root(value: SplitNode | null) {
		if (typeof value === "string") {
			this.#focused = value;
		}

		storage.state.layout = value;
	}

	public get focused() {
		return this.#focused;
	}

	public set focused(value: string | null) {
		this.#focused = value;
	}

	/**
	 * Ensures the given channel is present in the layout. Focus it if already in the tree;
	 * otherwise replace the focused pane; otherwise set the root.
	 */
	public ensure(channelId: string) {
		if (!this.root) {
			this.root = channelId;
			return;
		}

		if (this.contains(this.root, channelId)) {
			this.focused = channelId;
			return;
		}

		if (this.#focused && this.contains(this.root, this.#focused)) {
			this.replace(this.#focused, channelId);
			this.focused = channelId;
			return;
		}

		this.root = channelId;
	}

	public insert(target: string, newNode: string, branch: SplitBranch) {
		if (!this.root) {
			this.root = target;
			return;
		}

		this.#update(target, (node) => {
			if (typeof node === "string") {
				return { ...branch, size: 50 };
			}

			return {
				axis: branch.axis,
				before: node,
				after: newNode,
				size: 50,
			};
		});
	}

	public insertEmpty(target: string, axis: SplitAxis) {
		const id = emptyPaneId();

		this.insert(target, id, {
			axis,
			before: target,
			after: id,
		});

		this.focused = id;
	}

	public remove(target: string) {
		if (!this.root) return;

		if (this.root === target) {
			this.root = null;
			return;
		}

		if (typeof this.root !== "string") {
			if (this.root.before === target) {
				this.root = this.root.after;
				return;
			}

			if (this.root.after === target) {
				this.root = this.root.before;
				return;
			}
		}

		this.root = this.#remove(this.root, target);
	}

	public replace(target: string, replacement: string) {
		if (!this.root || target === replacement) return;

		this.#update(target, () => replacement);
	}

	public navigate(startId: string, direction: SplitDirection) {
		if (!this.root || this.root === startId) return null;

		const rects = this.#getLayoutRects(this.root);
		const current = rects.find((r) => r.id === startId);
		if (!current) return null;

		const threshold = 0.001;

		const candidates = rects.filter((rect) => {
			if (rect.id === startId) return false;

			switch (direction) {
				case "up":
					return rect.y + rect.height <= current.y + threshold;
				case "down":
					return rect.y >= current.y + current.height - threshold;
				case "left":
					return rect.x + rect.width <= current.x + threshold;
				case "right":
					return rect.x >= current.x + current.width - threshold;
				default:
					return false;
			}
		});

		if (!candidates.length) return null;

		const [best] = candidates.toSorted((a, b) => {
			const distA = this.#getDistance(current, a, direction);
			const distB = this.#getDistance(current, b, direction);

			if (Math.abs(distA - distB) > threshold) {
				return distA - distB;
			}

			return (
				this.#getAlignmentScore(current, b, direction) -
				this.#getAlignmentScore(current, a, direction)
			);
		});

		return best.id;
	}

	public contains(node: SplitNode, id: string): boolean {
		if (typeof node === "string") {
			return node === id;
		}

		return this.contains(node.before, id) || this.contains(node.after, id);
	}

	public handleDragEnd(event: DragEndEvent): boolean {
		const source = event.operation.source;
		const target = event.operation.target;
		if (!source || !target) return false;

		const sourceData = isSourceData(source.data) ? source.data : null;
		const targetData = isTargetData(target.data) ? target.data : null;
		if (!sourceData || !targetData) return false;

		const { paneId, position } = targetData;
		const sourceId = sourceData.id;

		if (sourceId === paneId) return true;

		// Empty tree
		if (!this.root) {
			this.root = sourceId;
			this.focused = sourceId;
			return true;
		}

		if (sourceData.kind === "pane") {
			// Remove the source from its current location before re-inserting
			this.remove(sourceId);

			// If removing it collapsed the tree to nothing, just set as root
			if (!this.root) {
				this.root = sourceId;
				return true;
			}

			// If the target pane was removed as a side-effect, bail
			if (!this.contains(this.root, paneId)) {
				this.root = sourceId;
				return true;
			}
		}

		if (position === "center") {
			this.replace(paneId, sourceId);
			this.focused = sourceId;
			return true;
		}

		const isVertical = position === "up" || position === "down";
		const isFirst = position === "up" || position === "left";

		this.insert(paneId, sourceId, {
			axis: isVertical ? "vertical" : "horizontal",
			before: isFirst ? sourceId : paneId,
			after: isFirst ? paneId : sourceId,
		});

		this.focused = sourceId;
		return true;
	}

	#find(node: SplitNode, target: string): SplitPath | null {
		if (typeof node === "string") {
			return node === target ? [] : null;
		}

		const bPath = this.#find(node.before, target);
		if (bPath) return ["before", ...bPath];

		const aPath = this.#find(node.after, target);
		if (aPath) return ["after", ...aPath];

		return null;
	}

	#update(target: string, updater: (node: SplitNode) => SplitNode) {
		const path = this.#find(this.root!, target);

		if (path) {
			this.root = this.#applyUpdate(this.root!, path, updater);
		}
	}

	#applyUpdate(
		node: SplitNode,
		path: SplitPath,
		updater: (node: SplitNode) => SplitNode,
	): SplitNode {
		if (!path.length) return updater(node);

		if (typeof node === "string") {
			throw new TypeError("Path continues but node is a leaf");
		}

		const [side, ...rest] = path;

		return {
			...node,
			[side]: this.#applyUpdate(node[side], rest, updater),
		};
	}

	#remove(node: SplitNode, target: string): SplitNode {
		if (typeof node === "string") return node;

		if (node.before === target) return node.after;
		if (node.after === target) return node.before;

		return {
			...node,
			before: this.#remove(node.before, target),
			after: this.#remove(node.after, target),
		};
	}

	#getLayoutRects(
		node: SplitNode,
		{ x, y, width, height }: Omit<SplitRect, "id"> = { x: 0, y: 0, width: 1, height: 1 },
	): SplitRect[] {
		if (typeof node === "string") {
			return [{ id: node, x, y, width, height }];
		}

		const isRow = node.axis === "horizontal";
		const ratio = (node.size ?? 50) / 100;

		const sizeFirst = isRow ? width * ratio : height * ratio;
		const sizeSecond = isRow ? width * (1 - ratio) : height * (1 - ratio);

		return [
			...this.#getLayoutRects(node.before, {
				x,
				y,
				width: isRow ? sizeFirst : width,
				height: !isRow ? sizeFirst : height,
			}),
			...this.#getLayoutRects(node.after, {
				x: isRow ? x + sizeFirst : x,
				y: !isRow ? y + sizeFirst : y,
				width: isRow ? sizeSecond : width,
				height: !isRow ? sizeSecond : height,
			}),
		];
	}

	// oxlint-disable-next-line typescript/consistent-return
	#getDistance(from: SplitRect, to: SplitRect, direction: SplitDirection) {
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

	#getAlignmentScore(from: SplitRect, to: SplitRect, direction: SplitDirection) {
		const isVerticalMove = direction === "up" || direction === "down";

		const startSrc = isVerticalMove ? from.x : from.y;
		const endSrc = isVerticalMove ? from.x + from.width : from.y + from.height;

		const startTgt = isVerticalMove ? to.x : to.y;
		const endTgt = isVerticalMove ? to.x + to.width : to.y + to.height;

		const overlapStart = Math.max(startSrc, startTgt);
		const overlapEnd = Math.min(endSrc, endTgt);

		return Math.max(0, overlapEnd - overlapStart);
	}
}
