import { storage } from "$lib/stores";
import { bounds, neighbor } from "./geometry";
import * as tree from "./tree";
import {
	LAYOUT_VERSION,
	type DragData,
	type DragState,
	type DropData,
	type DropTarget,
	type Pane,
	type Split,
	type SplitDirection,
	type SplitDropPosition,
	type SplitNode,
} from "./types";

type Point = { x: number; y: number } | undefined;

export class SplitController {
	readonly #paneRefs = new Map<string, HTMLElement>();

	/**
	 * The id of the focused pane.
	 */
	public focusedPaneId = $state<string | null>(null);

	/**
	 * The focused pane if it is still part of the layout.
	 */
	public readonly focused = $derived(this.focusedPaneId ? this.pane(this.focusedPaneId) : null);

	/**
	 * The channel or tab drag in progress.
	 */
	public drag = $state<DragState | null>(null);

	/**
	 * The pane and zone currently highlighted while dragging.
	 */
	public dropTarget = $state<DropTarget | null>(null);

	public constructor() {
		console.log("SplitController initialized");
	}

	public get root(): SplitNode | null {
		return storage.state.layout?.root ?? null;
	}

	public set root(value: SplitNode | null) {
		if (value && tree.isLeaf(value)) {
			this.focusedPaneId = value.id;
		}

		storage.state.layout = value ? { version: LAYOUT_VERSION, root: value } : null;
	}

	public pane(id: string): Pane | null {
		return this.root ? tree.findLeaf(this.root, (p) => p.id === id) : null;
	}

	/**
	 * The pane containing the given channel tab, if any.
	 */
	public paneOf(tabId: string): Pane | null {
		return this.root ? tree.findLeaf(this.root, (p) => p.tabs.includes(tabId)) : null;
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
	 * layout; otherwise opens it in the focused pane, or a new root pane.
	 */
	public ensure(channelId: string) {
		const existing = this.paneOf(channelId);

		if (existing) {
			this.#focus(existing, channelId);
			return;
		}

		if (!this.root) {
			this.root = tree.createPane([channelId]);
			return;
		}

		const pane = this.focused ?? tree.firstLeaf(this.root);
		pane.tabs.push(channelId);

		this.#focus(pane, channelId);
	}

	/**
	 * Opens the given channel as a tab of the given pane, moving it there if it
	 * is already open elsewhere.
	 */
	public addTab(paneId: string, channelId: string, index?: number) {
		const pane = this.pane(paneId);
		if (!pane) return;

		const source = this.paneOf(channelId);
		if (source === pane) {
			this.#focus(pane, channelId);
			return;
		}

		pane.tabs.splice(index ?? pane.tabs.length, 0, channelId);
		this.#focus(pane, channelId);

		this.#detach(source, channelId);
	}

	/**
	 * Activates the given tab and focuses its pane.
	 */
	public activate(id: string) {
		const pane = this.paneOf(id);
		if (pane) this.#focus(pane, id);
	}

	/**
	 * Reorders a tab within its own pane to the given index.
	 */
	public reorderTab(id: string, paneId: string, index: number) {
		const pane = this.pane(paneId);
		if (!pane) return;

		const from = pane.tabs.indexOf(id);
		if (from === -1) return;

		pane.tabs.splice(from, 1);

		const dest = Math.max(0, Math.min(index > from ? index - 1 : index, pane.tabs.length));

		pane.tabs.splice(dest, 0, id);
		this.#focus(pane, id);
	}

	/**
	 * Moves a tab to the given pane at an optional index, removing it from its
	 * source pane.
	 */
	public moveTab(id: string, paneId: string, index?: number) {
		const source = this.paneOf(id);
		const target = this.pane(paneId);

		if (!target || source === target) return;

		target.tabs.splice(index ?? target.tabs.length, 0, id);

		this.#focus(target, id);
		this.#detach(source, id);
	}

	/**
	 * Closes the given tab, auto-closing the pane if it becomes empty.
	 */
	public closeTab(id: string) {
		const pane = this.paneOf(id);
		if (pane) this.#detach(pane, id);
	}

	/**
	 * Splits the given pane in the given direction, opening a new empty pane.
	 */
	public split(paneId: string, direction: SplitDirection) {
		this.#insertPane(paneId, direction, tree.createPane());
	}

	/**
	 * Splits the target pane in the given direction, placing the channel in the
	 * new sibling and removing it from its current pane.
	 */
	public splitWithTab(paneId: string, direction: SplitDirection, channelId: string) {
		const source = this.paneOf(channelId);
		this.#removeTab(source, channelId);

		this.#insertPane(paneId, direction, tree.createPane([channelId]));
		this.#closeIfEmpty(source);
	}

	/**
	 * Removes the pane from the layout, collapsing its parent split.
	 */
	public closePane(paneId: string) {
		if (!this.root) return;

		this.root = tree.removeLeaf(this.root, paneId);

		if (this.focusedPaneId === paneId) {
			this.focusedPaneId = this.root ? tree.firstLeaf(this.root).id : null;
		}
	}

	/**
	 * Applies new sibling sizes to a split.
	 */
	public resize(splitId: string, [before, after]: number[]) {
		const split = this.#findSplit(splitId);
		if (!split) return;

		split.before.size = before;
		split.after.size = after;
	}

	/**
	 * The pane adjacent to `startId` in the given direction, if any.
	 */
	public navigate(startId: string, direction: SplitDirection): string | null {
		if (!this.root) return null;

		return neighbor(bounds(this.root), startId, direction);
	}

	/**
	 * Begins tracking a tab or channel drag.
	 */
	public startDrag(data: DragData) {
		this.drag = { channelId: data.id, sourcePaneId: data.paneId ?? null };
	}

	/**
	 * Recomputes the highlighted drop target for the given droppable + pointer.
	 */
	public updateDropTarget(data: DropData | null, point: Point) {
		if (!this.drag || !data || this.#isSelfNoop(data.paneId)) {
			this.dropTarget = null;
			return;
		}

		if (data.kind === "pane") {
			this.dropTarget = { paneId: data.paneId, zone: this.#zoneForPane(data.paneId, point) };
		} else if (data.kind === "tab-bar") {
			// Dropping on the tab bar appends, shown as an insertion indicator
			// after the last tab.
			this.dropTarget = { paneId: data.paneId, zone: "tab-bar" };
		} else {
			// A drop onto a tab relies on the per-tab highlight only.
			this.dropTarget = null;
		}
	}

	/**
	 * Resolves and clears the current drag against the given drop target.
	 */
	public endDrag(data: DropData | null, point: Point) {
		const drag = this.drag;
		this.drag = null;
		this.dropTarget = null;

		if (!drag || !data || this.#isSelfNoop(data.paneId)) return;

		if (data.kind === "pane") {
			this.#dropIntoZone(drag.channelId, data.paneId, this.#zoneForPane(data.paneId, point));
		} else if (drag.sourcePaneId === data.paneId) {
			const index = data.index ?? this.pane(data.paneId)?.tabs.length ?? 0;
			this.reorderTab(drag.channelId, data.paneId, index);
		} else {
			this.moveTab(drag.channelId, data.paneId, data.index);
		}
	}

	#insertPane(paneId: string, direction: SplitDirection, pane: Pane) {
		this.root = this.root ? tree.splitLeaf(this.root, paneId, direction, pane) : pane;
		this.focusedPaneId = pane.id;
	}

	#focus(pane: Pane, tabId: string) {
		pane.active = tabId;
		this.focusedPaneId = pane.id;
	}

	#detach(pane: Pane | null, tabId: string) {
		if (!pane) return;

		this.#removeTab(pane, tabId);
		this.#closeIfEmpty(pane);
	}

	#removeTab(pane: Pane | null, tabId: string) {
		if (!pane) return;

		const index = pane.tabs.indexOf(tabId);
		if (index === -1) return;

		pane.tabs.splice(index, 1);

		if (pane.active === tabId) {
			pane.active = pane.tabs[index] ?? pane.tabs.at(-1) ?? null;
		}
	}

	#closeIfEmpty(pane: Pane | null) {
		if (pane && pane.tabs.length === 0) {
			this.closePane(pane.id);
		}
	}

	#findSplit(splitId: string): Split | null {
		const walk = (node: SplitNode | null): Split | null => {
			if (!node || tree.isLeaf(node)) return null;
			if (node.id === splitId) return node;

			return walk(node.before) ?? walk(node.after);
		};

		return walk(this.root);
	}

	/**
	 * Dropping a tab back onto its own pane when it's the only tab is a no-op
	 */
	#isSelfNoop(paneId: string): boolean {
		if (!this.drag || this.drag.sourcePaneId !== paneId) {
			return false;
		}

		return (this.pane(paneId)?.tabs.length ?? 0) <= 1;
	}

	/**
	 * The drop zone for a pane, derived from the pointer position against the
	 * pane's live bounding rect.
	 */
	#zoneForPane(paneId: string, point: Point): SplitDropPosition {
		const rect = point && this.#paneRefs.get(paneId)?.getBoundingClientRect();
		if (!rect || rect.width === 0 || rect.height === 0) return "center";

		const x = point.x - rect.left;
		const y = point.y - rect.top;

		const hEdge = Math.max(80, rect.width * 0.25);
		const vEdge = Math.max(80, rect.height * 0.25);

		if (x < hEdge) return "left";
		if (x > rect.width - hEdge) return "right";
		if (y < vEdge) return "top";
		if (y > rect.height - vEdge) return "bottom";

		return "center";
	}

	/**
	 * `center` moves/opens the channel in the pane; an edge splits the pane and
	 * places the channel in the new sibling.
	 */
	#dropIntoZone(channelId: string, paneId: string, zone: SplitDropPosition) {
		if (zone === "center") {
			this.addTab(paneId, channelId);
		} else {
			this.splitWithTab(paneId, tree.edgeToDirection(zone), channelId);
		}
	}
}
