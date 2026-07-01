export type Orientation = "horizontal" | "vertical";

export type DropZone = "center" | "left" | "right" | "top" | "bottom";

/** A single tab. */
export interface Tab {
	id: string;
	title: string;
	icon?: string;
	isDirty?: boolean;
	data?: unknown;
}

export interface PaneNode {
	type: "pane";
	id: string;
	tabs: Tab[];
	selectedTabId: string | null;
}

export interface SplitNode {
	type: "split";
	id: string;
	orientation: Orientation;
	first: LayoutNode;
	second: LayoutNode;
	sizes: [number, number];
}

export type LayoutNode = PaneNode | SplitNode;

export class SplitTree {
	public constructor(public root: LayoutNode) {}
}
