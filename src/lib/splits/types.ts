import type { Edge, LayoutDocument } from "@danfessler/trellis";

export type SplitDirection = "up" | "down" | "left" | "right";

export type SplitDropZone = Edge | "center";

export const LAYOUT_VERSION = 3;

/**
 * The persisted split layout.
 */
export type Layout = LayoutDocument;

/**
 * The view types registered with the workspace. A channel view's id is the id
 * of the channel it shows.
 */
export type ViewType = "channel" | "empty";

// A type alias rather than an interface so it satisfies Trellis' `Params`
// index signature
export type ChannelViewParams = {
	/**
	 * Whether the channel was joined ephemerally.
	 */
	ephemeral?: boolean;
};

/**
 * A normalized rectangle occupied by a panel, used for spatial focus
 * navigation.
 */
export interface Rect {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DragData {
	kind: "channel";
	id: string;
	ephemeral?: boolean;
}

export interface DropTarget {
	/**
	 * The panel under the pointer, or `null` when the workspace is empty.
	 */
	panelId: string | null;
	zone: SplitDropZone;

	/**
	 * The highlighted area in pixels, relative to the workspace.
	 */
	rect: { x: number; y: number; width: number; height: number };
}
