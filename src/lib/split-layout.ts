import type { DragEndEvent } from "@dnd-kit/abstract";
import type { PaneGroupProps } from "paneforge";
import { storage } from "./stores";

export type SplitDirection = "up" | "down" | "left" | "right";
export type SplitDropPosition = SplitDirection | "center";

export type SplitAxis = PaneGroupProps["direction"];

export interface SplitPane {
	id: string;
	/** Channel IDs, in tab order. A channel is unique across the whole layout. */
	tabs: string[];
	/** The currently visible tab. */
	active: string | null;
}

export interface SplitBranch {
	axis: SplitAxis;
	size?: number;
	before: SplitNode;
	after: SplitNode;
}

export type SplitNode = SplitBranch | SplitPane;

type SplitPath = ("before" | "after")[];

interface SplitRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

type DragSourceData = {
	kind: "channel" | "tab";
	id: string;
	paneId?: string;
};

type DragTargetData = {
	paneId: string;
	position: SplitDropPosition;
};

function isSourceData(data: Record<string, unknown>): data is DragSourceData {
	if (!data || typeof data !== "object") return false;

	return (data.kind === "channel" || data.kind === "tab") && typeof data.id === "string";
}

function isTargetData(data: Record<string, unknown>): data is DragTargetData {
	if (!data || typeof data !== "object") return false;

	return typeof data.paneId === "string" && typeof data.position === "string";
}

export function isPane(node: SplitNode): node is SplitPane {
	return "tabs" in node;
}

export function createPane(tabs: string[] = []): SplitPane {
	return {
		id: `pane-${crypto.randomUUID()}`,
		tabs,
		active: tabs.at(-1) ?? null,
	};
}

export function firstPane(node: SplitNode): SplitPane {
	return isPane(node) ? node : firstPane(node.before);
}

/**
 * Split layout implemented as a binary tree where each node is either a
 * {@linkcode SplitBranch} or a leaf {@linkcode SplitPane} holding an ordered
 * set of channel tabs.
 */
export class SplitLayout {
	#focusedPane: string | null = null;

	public get root() {
		return storage.state.layout;
	}

	public set root(value: SplitNode | null) {
		if (value && isPane(value)) {
			this.#focusedPane = value.id;
		}

		storage.state.layout = value;
	}

	/**
	 * The ID of the focused pane.
	 */
	public get focusedPane() {
		return this.#focusedPane;
	}

	public set focusedPane(value: string | null) {
		this.#focusedPane = value;
	}

	/**
	 * The focused pane, if it is still part of the layout.
	 */
	public get focused(): SplitPane | null {
		return this.#focusedPane ? this.pane(this.#focusedPane) : null;
	}

	/**
	 * All panes in the layout, in tree order.
	 */
	public panes(node: SplitNode | null = this.root): SplitPane[] {
		if (!node) return [];
		if (isPane(node)) return [node];

		return [...this.panes(node.before), ...this.panes(node.after)];
	}

	public pane(id: string): SplitPane | null {
		return this.panes().find((pane) => pane.id === id) ?? null;
	}

	/**
	 * The pane containing the given channel tab, if any.
	 */
	public paneOf(tabId: string): SplitPane | null {
		return this.panes().find((pane) => pane.tabs.includes(tabId)) ?? null;
	}

	public get tabGroups(): Record<string, string[]> {
		return Object.fromEntries(this.panes().map((pane) => [pane.id, pane.tabs]));
	}

	public set tabGroups(groups: Record<string, string[]>) {
		for (const pane of this.panes()) {
			const tabs = groups[pane.id];
			if (!tabs) continue;

			pane.tabs = tabs;

			if (!pane.active || !tabs.includes(pane.active)) {
				pane.active = tabs.at(-1) ?? null;
			}
		}
	}

	/**
	 * Ensures the given channel is open as a tab. Activates it if already in the
	 * layout; otherwise opens it in the focused pane; otherwise creates a root pane.
	 */
	public ensure(channelId: string) {
		const existing = this.paneOf(channelId);
		if (existing) {
			existing.active = channelId;
			this.focusedPane = existing.id;
			return;
		}

		if (!this.root) {
			this.root = createPane([channelId]);
			return;
		}

		const pane = this.focused ?? firstPane(this.root);
		pane.tabs.push(channelId);
		pane.active = channelId;
		this.focusedPane = pane.id;
	}

	/**
	 * Opens the given channel as a tab of the given pane, moving it there if it
	 * is already open elsewhere.
	 */
	public addTab(paneId: string, channelId: string, index?: number) {
		const pane = this.pane(paneId);
		if (!pane) return;

		const existing = this.paneOf(channelId);

		if (existing === pane) {
			pane.active = channelId;
			this.focusedPane = pane.id;
			return;
		}

		if (existing) {
			this.#removeTab(existing, channelId);
		}

		pane.tabs.splice(index ?? pane.tabs.length, 0, channelId);
		pane.active = channelId;
		this.focusedPane = pane.id;
	}

	/**
	 * Activates the given tab and focuses its pane.
	 */
	public activate(tabId: string) {
		const pane = this.paneOf(tabId);
		if (!pane) return;

		pane.active = tabId;
		this.focusedPane = pane.id;
	}

	/**
	 * Closes the given tab. The pane is kept even when it becomes empty.
	 */
	public closeTab(tabId: string) {
		const pane = this.paneOf(tabId);
		if (!pane) return;

		this.#removeTab(pane, tabId);
	}

	/**
	 * Removes the pane from the layout, collapsing its branch.
	 */
	public closePane(paneId: string) {
		if (!this.root) return;

		if (isPane(this.root)) {
			if (this.root.id === paneId) {
				this.root = null;
				this.#focusedPane = null;
			}

			return;
		}

		this.root = this.#removeNode(this.root, paneId);

		if (this.#focusedPane === paneId) {
			this.#focusedPane = this.root ? firstPane(this.root).id : null;
		}
	}

	/**
	 * Splits the given pane along the axis, opening a new empty pane after it.
	 */
	public split(paneId: string, axis: SplitAxis, pane = createPane()) {
		if (!this.root) {
			this.root = pane;
			return pane;
		}

		this.#update(paneId, (node) => ({
			axis,
			size: 50,
			before: node,
			after: pane,
		}));

		this.focusedPane = pane.id;
		return pane;
	}

	/**
	 * Moves the channel into a new pane split off the target pane in the given
	 * direction, removing it from its current pane first.
	 */
	public splitWithTab(paneId: string, direction: SplitDirection, channelId: string) {
		const source = this.paneOf(channelId);
		if (source) {
			this.#removeTab(source, channelId);
		}

		if (!this.root) {
			this.root = createPane([channelId]);
			return;
		}

		const pane = createPane([channelId]);
		const axis: SplitAxis =
			direction === "up" || direction === "down" ? "vertical" : "horizontal";
		const first = direction === "up" || direction === "left";

		this.#update(paneId, (node) => ({
			axis,
			size: 50,
			before: first ? pane : node,
			after: first ? node : pane,
		}));

		this.focusedPane = pane.id;
	}

	/**
	 * Moves the tab to the end of the given pane without activating it. Used
	 * while dragging over another pane's tab bar.
	 */
	public moveTabToPane(tabId: string, paneId: string) {
		const source = this.paneOf(tabId);
		const target = this.pane(paneId);
		if (!target || source === target) return;

		if (source) {
			this.#removeTab(source, tabId);
		}

		target.tabs.push(tabId);
		target.active ??= tabId;
	}

	public navigate(startId: string, direction: SplitDirection) {
		if (!this.root || (isPane(this.root) && this.root.id === startId)) return null;

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

	public handleDragEnd(event: DragEndEvent): boolean {
		const source = event.operation.source;
		const target = event.operation.target;
		if (!source || !target) return false;

		const sourceData = isSourceData(source.data) ? source.data : null;
		const targetData = isTargetData(target.data) ? target.data : null;
		if (!sourceData || !targetData) return false;

		const { paneId, position } = targetData;
		const channelId = sourceData.id;

		// Empty tree
		if (!this.root) {
			this.root = createPane([channelId]);
			return true;
		}

		if (position === "center") {
			this.addTab(paneId, channelId);
			return true;
		}

		// Splitting a pane off its own only tab is a no-op.
		const sourcePane = this.paneOf(channelId);
		if (sourcePane?.id === paneId && sourcePane.tabs.length === 1) return true;

		this.splitWithTab(paneId, position, channelId);
		return true;
	}

	#removeTab(pane: SplitPane, tabId: string) {
		const index = pane.tabs.indexOf(tabId);
		if (index === -1) return;

		pane.tabs.splice(index, 1);

		if (pane.active === tabId) {
			pane.active = pane.tabs[index] ?? pane.tabs.at(-1) ?? null;
		}
	}

	#find(node: SplitNode, paneId: string): SplitPath | null {
		if (isPane(node)) {
			return node.id === paneId ? [] : null;
		}

		const bPath = this.#find(node.before, paneId);
		if (bPath) return ["before", ...bPath];

		const aPath = this.#find(node.after, paneId);
		if (aPath) return ["after", ...aPath];

		return null;
	}

	#update(paneId: string, updater: (node: SplitNode) => SplitNode) {
		const path = this.#find(this.root!, paneId);

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

		if (isPane(node)) {
			throw new TypeError("Path continues but node is a leaf");
		}

		const [side, ...rest] = path;

		return {
			...node,
			[side]: this.#applyUpdate(node[side], rest, updater),
		};
	}

	#removeNode(node: SplitNode, paneId: string): SplitNode {
		if (isPane(node)) return node;

		if (isPane(node.before) && node.before.id === paneId) return node.after;
		if (isPane(node.after) && node.after.id === paneId) return node.before;

		return {
			...node,
			before: this.#removeNode(node.before, paneId),
			after: this.#removeNode(node.after, paneId),
		};
	}

	#getLayoutRects(
		node: SplitNode,
		{ x, y, width, height }: Omit<SplitRect, "id"> = { x: 0, y: 0, width: 1, height: 1 },
	): SplitRect[] {
		if (isPane(node)) {
			return [{ id: node.id, x, y, width, height }];
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
