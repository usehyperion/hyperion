import type { DragData, DropData } from "./types";

/**
 * The drag-and-drop types; a drag's type matches its data's `kind` where it
 * has one.
 */
export const DND = {
	tab: "tab",
	channel: "channel",
	pane: "pane",
	tabBar: "tab-bar",
	pinned: "pinned",
} as const;

/**
 * What can be dropped onto panes, tabs, and tab bars.
 */
export const TAB_SOURCES = [DND.tab, DND.channel];

export function channelDrag(channel: { id: string; ephemeral: boolean }): DragData {
	return { kind: DND.channel, id: channel.id, ephemeral: channel.ephemeral };
}

export function tabDrag(id: string, paneId: string): DragData {
	return { kind: DND.tab, id, paneId };
}

export function tabDrop(paneId: string, index: number): DropData {
	return { kind: DND.tab, paneId, index };
}

export function paneDrop(paneId: string): DropData {
	return { kind: DND.pane, paneId };
}

export function tabBarDrop(paneId: string): DropData {
	return { kind: DND.tabBar, paneId };
}
