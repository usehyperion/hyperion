export type SplitAxis = "horizontal" | "vertical";

export type SplitDirection = "up" | "down" | "left" | "right";

export type SplitDropPosition = "top" | "right" | "bottom" | "left" | "center";

export type SplitEdge = Exclude<SplitDropPosition, "center">;

interface Node {
	id: string;

	/**
	 * Size relative to its sibling, as a percentage.
	 */
	size: number;
}

/**
 * A leaf node holding an ordered stack of channel tabs.
 */
export interface Pane extends Node {
	readonly type: "pane";

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
export interface Split extends Node {
	readonly type: "split";
	axis: SplitAxis;
	before: SplitNode;
	after: SplitNode;
}

export type SplitNode = Split | Pane;

/**
 * A normalized rectangle occupied by a pane, used for spatial focus navigation
 * and drop-zone geometry.
 */
export interface Rect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DragState {
	channelId: string;
	sourcePaneId: string | null;
}

export interface DropTarget {
	paneId: string;
	zone: SplitDropPosition;
}

export interface DragData {
	kind: "tab" | "channel";
	id: string;
	paneId?: string;
}

export interface DropData {
	kind: "pane" | "tab" | "tabbar";
	paneId: string;
	index?: number;
}
