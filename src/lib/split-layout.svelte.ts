import { storage } from "./stores";

export type SplitAxis = "horizontal" | "vertical";

export type SplitDirection = "up" | "down" | "left" | "right";

export type SplitDropPosition = "center" | "left" | "right" | "top" | "bottom";

/**
 * A leaf node holding an ordered stack of channel tabs. A channel is unique
 * across the whole layout, so tab identity is just the channel id.
 */
export interface SplitLeaf {
	readonly type: "leaf";
	id: string;

	/**
	 * Channel ids in tab order.
	 */
	tabs: string[];

	/**
	 * The currently visible tab.
	 */
	active: string | null;
}

/**
 * A branch node splitting two children along an axis.
 */
export interface SplitBranch {
	readonly type: "branch";
	id: string;
	axis: SplitAxis;
	sizes: [before: number, after: number];
	before: SplitNode;
	after: SplitNode;
}

export type SplitNode = SplitBranch | SplitLeaf;

interface SplitRect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export function isLeaf(node: SplitNode): node is SplitLeaf {
	return node.type === "leaf";
}

function uid(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}`;
}

export function createLeaf(tabs: string[] = []): SplitLeaf {
	return {
		type: "leaf",
		id: uid("leaf"),
		tabs,
		active: tabs.at(-1) ?? null,
	};
}

export function firstLeaf(node: SplitNode): SplitLeaf {
	return isLeaf(node) ? node : firstLeaf(node.before);
}

/**
 * The split axis produced by dropping on the given edge zone.
 */
function zoneAxis(zone: Exclude<SplitDropPosition, "center">): SplitAxis {
	return zone === "left" || zone === "right" ? "horizontal" : "vertical";
}

/**
 * Whether the given edge zone places the new pane before the target.
 */
function zoneInsertsBefore(zone: Exclude<SplitDropPosition, "center">): boolean {
	return zone === "left" || zone === "top";
}

const DIRECTION_ZONE: Record<SplitDirection, Exclude<SplitDropPosition, "center">> = {
	up: "top",
	down: "bottom",
	left: "left",
	right: "right",
};

/**
 * Transient state describing an in-progress channel/tab drag.
 */
export interface SplitDragState {
	channelId: string;
	/** The pane the tab is being dragged from, if it originated from the layout. */
	sourcePaneId: string | null;
}

/**
 * The pane + zone currently highlighted as a drop target.
 */
export interface SplitDropTarget {
	paneId: string;
	zone: SplitDropPosition;
}

/**
 * Split layout implemented as a binary tree where each node is either a
 * {@linkcode SplitBranch} or a {@linkcode SplitLeaf}.
 */
export class SplitLayout {
	#focusedPane = $state<string | null>(null);

	/** Active drag (a channel or tab being dragged), or null. */
	drag = $state<SplitDragState | null>(null);
	/** Highlighted drop target while dragging, or null. */
	dropTarget = $state<SplitDropTarget | null>(null);

	/**
	 * Live DOM elements for each pane's content area, used to compute drop zones
	 * from pointer geometry.
	 */
	readonly #paneRefs = new Map<string, HTMLElement>();

	public get root() {
		return storage.state.layout;
	}

	public set root(value: SplitNode | null) {
		if (value && isLeaf(value)) {
			this.#focusedPane = value.id;
		}

		storage.state.layout = value;
	}

	public get focusedPane() {
		return this.#focusedPane;
	}

	public set focusedPane(value: string | null) {
		this.#focusedPane = value;
	}

	/** The focused pane, if it is still part of the layout. */
	public get focused(): SplitLeaf | null {
		return this.#focusedPane ? this.pane(this.#focusedPane) : null;
	}

	/**
	 * Collect all panes in the layout in tree order.
	 */
	public collect(node = this.root): SplitLeaf[] {
		if (!node) return [];
		if (isLeaf(node)) return [node];

		return [...this.collect(node.before), ...this.collect(node.after)];
	}

	public pane(id: string): SplitLeaf | null {
		return this.collect().find((pane) => pane.id === id) ?? null;
	}

	/** The pane containing the given channel tab, if any. */
	public paneOf(tabId: string): SplitLeaf | null {
		return this.collect().find((pane) => pane.tabs.includes(tabId)) ?? null;
	}

	public registerPaneElement(paneId: string, el: HTMLElement) {
		this.#paneRefs.set(paneId, el);
	}

	public unregisterPaneElement(paneId: string, el: HTMLElement) {
		if (this.#paneRefs.get(paneId) === el) {
			this.#paneRefs.delete(paneId);
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
			this.root = createLeaf([channelId]);
			return;
		}

		const pane = this.focused ?? firstLeaf(this.root);

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

		pane.tabs.splice(index ?? pane.tabs.length, 0, channelId);
		pane.active = channelId;
		this.focusedPane = pane.id;

		if (existing) {
			this.#removeTab(existing, channelId);
			this.#closeIfEmpty(existing);
		}
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
	 * Closes the given tab, auto-closing the pane if it becomes empty.
	 */
	public closeTab(tabId: string) {
		const pane = this.paneOf(tabId);
		if (!pane) return;

		this.#removeTab(pane, tabId);
		this.#closeIfEmpty(pane);
	}

	/**
	 * Removes the pane from the layout, collapsing its branch.
	 */
	public closePane(paneId: string) {
		if (!this.root) return;

		if (isLeaf(this.root)) {
			if (this.root.id === paneId) {
				this.root = null;
				this.#focusedPane = null;
			}

			return;
		}

		this.root = this.#removeNode(this.root, paneId);

		if (this.#focusedPane === paneId) {
			this.#focusedPane = this.root ? firstLeaf(this.root).id : null;
		}
	}

	/**
	 * Splits the given pane along the axis, opening a new pane after it.
	 */
	public split(paneId: string, axis: SplitAxis, pane = createLeaf()) {
		if (!this.root) {
			this.root = pane;
			return pane;
		}

		this.root = this.#splitNode(this.root, paneId, axis, pane, false);
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
			this.root = createLeaf([channelId]);
			return;
		}

		const pane = createLeaf([channelId]);
		const zone = DIRECTION_ZONE[direction];

		this.root = this.#splitNode(
			this.root,
			paneId,
			zoneAxis(zone),
			pane,
			zoneInsertsBefore(zone),
		);

		this.focusedPane = pane.id;

		if (source) {
			this.#closeIfEmpty(source);
		}
	}

	/**
	 * Moves the tab to the end of the given pane without activating it. Used
	 * while dragging over another pane's tab bar.
	 */
	public moveTabToPane(tabId: string, paneId: string, index?: number) {
		const source = this.paneOf(tabId);
		const target = this.pane(paneId);
		if (!target || source === target) return;

		target.tabs.splice(index ?? target.tabs.length, 0, tabId);
		target.active = tabId;

		if (source) {
			this.#removeTab(source, tabId);
			this.#closeIfEmpty(source);
		}
	}

	/**
	 * Reorders a tab within its own pane to the given index.
	 */
	public reorderTab(tabId: string, paneId: string, index: number) {
		const pane = this.pane(paneId);
		if (!pane) return;

		const from = pane.tabs.indexOf(tabId);
		if (from === -1) return;

		pane.tabs.splice(from, 1);
		let dest = index;
		if (dest > from) dest -= 1;
		dest = Math.max(0, Math.min(dest, pane.tabs.length));
		pane.tabs.splice(dest, 0, tabId);
		pane.active = tabId;
		this.focusedPane = pane.id;
	}

	/**
	 * Sets the size split of a branch (percent of each child, summing to 100).
	 */
	public setSizes(branchId: string, sizes: number[]) {
		if (sizes.length !== 2) return;

		const apply = (node: SplitNode) => {
			if (isLeaf(node)) return;
			if (node.id === branchId) {
				node.sizes = [sizes[0], sizes[1]];
			}
			apply(node.before);
			apply(node.after);
		};

		if (this.root) apply(this.root);
	}

	public navigate(startId: string, direction: SplitDirection) {
		if (!this.root || (isLeaf(this.root) && this.root.id === startId)) return null;

		const rects = this.#getLayoutRects(this.root);
		const current = rects.find((r) => r.id === startId);
		if (!current) return null;

		const eps = 0.001;
		const cMaxX = current.x + current.width;
		const cMaxY = current.y + current.height;

		const candidates = rects.filter((rect) => {
			if (rect.id === startId) return false;

			const rMaxX = rect.x + rect.width;
			const rMaxY = rect.y + rect.height;

			switch (direction) {
				case "up":
					return rMaxY <= current.y + eps;
				case "down":
					return rect.y >= cMaxY - eps;
				case "left":
					return rMaxX <= current.x + eps;
				case "right":
					return rect.x >= cMaxX - eps;
				default:
					return false;
			}
		});

		if (!candidates.length) return null;

		const isVertical = direction === "up" || direction === "down";

		const [best] = candidates.toSorted((a, b) => {
			const overlapA = this.#overlap(current, a, isVertical);
			const overlapB = this.#overlap(current, b, isVertical);

			if (Math.abs(overlapA - overlapB) > eps) {
				return overlapB - overlapA;
			}

			return this.#distance(current, a, direction) - this.#distance(current, b, direction);
		});

		return best.id;
	}

	/**
	 * Computes the drop zone for a pane from the live pointer position against
	 * the pane's current bounding rect.
	 */
	public zoneForPane(
		paneId: string,
		point: { x: number; y: number } | undefined,
	): SplitDropPosition {
		const el = this.#paneRefs.get(paneId);
		if (!el || !point) return "center";

		const rect = el.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return "center";

		const lx = point.x - rect.left;
		const ly = point.y - rect.top;
		const hEdge = Math.max(80, rect.width * 0.25);
		const vEdge = Math.max(80, rect.height * 0.25);

		if (lx < hEdge) return "left";
		if (lx > rect.width - hEdge) return "right";
		if (ly < vEdge) return "top";
		if (ly > rect.height - vEdge) return "bottom";
		return "center";
	}

	/**
	 * Recomputes the highlighted drop target from the current drag against the
	 * given target.
	 */
	public updateDropTarget(
		target: { kind: string; paneId?: string } | null,
		point: { x: number; y: number } | undefined,
	) {
		const src = this.drag;
		if (!src || !target || !target.paneId || this.#isInvalidSelfDrop(target.paneId)) {
			this.dropTarget = null;
			return;
		}

		if (target.kind === "pane") {
			this.dropTarget = {
				paneId: target.paneId,
				zone: this.zoneForPane(target.paneId, point),
			};
		} else if (target.kind === "tab" || target.kind === "tabbar") {
			// Pure reorder within the same pane relies on the per-tab highlight.
			this.dropTarget =
				src.sourcePaneId === target.paneId
					? null
					: { paneId: target.paneId, zone: "center" };
		} else {
			this.dropTarget = null;
		}
	}

	/**
	 * Resolves a drop onto a pane's zone: `center` moves/opens the channel in the
	 * pane; an edge zone splits the pane and places the channel in the new sibling.
	 */
	public dropIntoZone(channelId: string, paneId: string, zone: SplitDropPosition) {
		if (zone === "center") {
			this.addTab(paneId, channelId);
			return;
		}

		const zoneToDirection: Record<Exclude<SplitDropPosition, "center">, SplitDirection> = {
			top: "up",
			bottom: "down",
			left: "left",
			right: "right",
		};

		this.splitWithTab(paneId, zoneToDirection[zone], channelId);
	}

	#isInvalidSelfDrop(paneId: string): boolean {
		const src = this.drag;
		if (!src || src.sourcePaneId !== paneId) return false;
		const pane = this.pane(src.sourcePaneId);
		return !!pane && pane.tabs.length <= 1;
	}

	#removeTab(pane: SplitLeaf, tabId: string) {
		const index = pane.tabs.indexOf(tabId);
		if (index === -1) return;

		pane.tabs.splice(index, 1);

		if (pane.active === tabId) {
			pane.active = pane.tabs[index] ?? pane.tabs.at(-1) ?? null;
		}
	}

	#closeIfEmpty(pane: SplitLeaf) {
		if (!pane.tabs.length) {
			this.closePane(pane.id);
		}
	}

	#splitNode(
		node: SplitNode,
		paneId: string,
		axis: SplitAxis,
		newPane: SplitLeaf,
		insertBefore: boolean,
	): SplitNode {
		if (isLeaf(node)) {
			if (node.id !== paneId) return node;

			return {
				type: "branch",
				id: uid("branch"),
				axis,
				sizes: [50, 50],
				before: insertBefore ? newPane : node,
				after: insertBefore ? node : newPane,
			};
		}

		return {
			...node,
			before: this.#splitNode(node.before, paneId, axis, newPane, insertBefore),
			after: this.#splitNode(node.after, paneId, axis, newPane, insertBefore),
		};
	}

	#removeNode(node: SplitNode, paneId: string): SplitNode {
		if (isLeaf(node)) return node;

		if (isLeaf(node.before) && node.before.id === paneId) {
			return node.after;
		}

		if (isLeaf(node.after) && node.after.id === paneId) {
			return node.before;
		}

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
		if (isLeaf(node)) {
			return [{ id: node.id, x, y, width, height }];
		}

		const isRow = node.axis === "horizontal";
		const ratio = node.sizes[0] / (node.sizes[0] + node.sizes[1]);

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

	#overlap(from: SplitRect, to: SplitRect, isVertical: boolean) {
		const startSrc = isVertical ? from.x : from.y;
		const endSrc = isVertical ? from.x + from.width : from.y + from.height;
		const startTgt = isVertical ? to.x : to.y;
		const endTgt = isVertical ? to.x + to.width : to.y + to.height;

		return Math.max(0, Math.min(endSrc, endTgt) - Math.max(startSrc, startTgt));
	}

	// oxlint-disable-next-line typescript/consistent-return
	#distance(from: SplitRect, to: SplitRect, direction: SplitDirection) {
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
}
