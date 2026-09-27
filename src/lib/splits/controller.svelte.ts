import {
	createWorkspace,
	layoutRects,
	type Edge,
	type Placement,
	type Surface,
	type ViewInfo,
	type WorkspaceHandle,
} from "@danfessler/trellis";

import { app } from "$lib/app.svelte";
import type { Channel } from "$lib/models/channel.svelte";
import { settings } from "$lib/settings";
import { storage } from "$lib/stores";

import { channelParams, isChannelView, panels, withoutEphemeral } from "./document";
import { neighbor } from "./geometry";
import {
	LAYOUT_VERSION,
	type ChannelViewParams,
	type DragData,
	type DropTarget,
	type Layout,
	type Rect,
	type SplitDirection,
	type SplitDropZone,
} from "./types";

type Point = { x: number; y: number } | undefined;

type DockTarget = { into: string } | { beside: string; edge: Edge };

const DIRECTION_EDGE: Record<SplitDirection, Edge> = {
	up: "top",
	down: "bottom",
	left: "left",
	right: "right",
};

export class SplitController {
	/**
	 * Changes requested while the workspace isn't mounted, applied once it is.
	 */
	readonly #pending: ((workspace: WorkspaceHandle) => void)[] = [];

	/**
	 * The mounted workspace, if the split view is on screen.
	 */
	public workspace = $state.raw<WorkspaceHandle | null>(null);

	/**
	 * The mount points of every view in the workspace.
	 */
	public surfaces = $state.raw<readonly Surface[]>([]);

	/**
	 * The id of the focused view. Kept while the workspace is unmounted so focus
	 * can be restored.
	 */
	public focusedViewId = $state<string | null>(null);

	/**
	 * The id of the panel containing the focused view.
	 */
	public readonly focusedPanelId = $derived.by(() => {
		const id = this.focusedViewId;
		if (!id) return null;

		return panels(this.layout?.root).find((panel) => panel.views.includes(id))?.id ?? null;
	});

	/**
	 * The id of the focused channel, if a channel view is focused.
	 */
	public readonly focused = $derived(
		this.focusedViewId && isChannelView(this.layout?.views[this.focusedViewId])
			? this.focusedViewId
			: null,
	);

	/**
	 * The channel drag in progress.
	 */
	public drag = $state<DragData | null>(null);

	/**
	 * The area highlighted while dragging a channel over the workspace.
	 */
	public dropTarget = $state<DropTarget | null>(null);

	public get layout(): Layout | null {
		return storage.state.layout ?? null;
	}

	/**
	 * Whether the given channel is open in the layout.
	 */
	public has(channelId: string) {
		return isChannelView(this.layout?.views[channelId]);
	}

	/**
	 * Mounts the workspace in `host`, returning a function that unmounts it.
	 */
	public attach(host: HTMLElement) {
		const workspace = createWorkspace(host, {
			types: {
				channel: {
					title: (view) => app.channels.get(view.id)?.user.displayName ?? view.id,
				},
				empty: {
					title: "Empty split",
				},
			},
			document: this.layout ? $state.snapshot(this.layout) : undefined,
			floating: false,
			label: "Splits",
			panelMenu: (entries, { panelId }) => [
				// Nothing can restore a hidden panel
				...entries.filter((entry) => entry === "separator" || entry.id !== "hide"),
				"separator",
				{ id: "close-split", label: "Close split", run: () => this.closePanel(panelId) },
			],
		});

		workspace.on("change", (layout) => {
			storage.state.layout = { ...layout, version: LAYOUT_VERSION };
		});

		workspace.on("surfaces", (surfaces) => {
			this.surfaces = surfaces;
		});

		workspace.on("close", (view) => void this.#closed(view));

		const unsubscribe = workspace.subscribe(() => this.#syncFocus(workspace));

		this.workspace = workspace;
		this.surfaces = workspace.surfaces();

		if (this.focusedViewId && workspace.getDocument().views[this.focusedViewId]) {
			workspace.focus(this.focusedViewId);
		}

		this.#syncFocus(workspace);

		for (const run of this.#pending.splice(0)) {
			run(workspace);
		}

		return () => {
			unsubscribe();

			this.workspace = null;
			this.surfaces = [];

			workspace.destroy();
		};
	}

	/**
	 * Ensures the given channel is open as a tab, focusing it. Opens it in the
	 * focused panel if it isn't in the layout yet.
	 */
	public ensure(channel: Channel) {
		this.#run((workspace) => {
			const layout = workspace.getDocument();

			if (layout.views[channel.id]) {
				this.#focus(workspace, channel.id);
				return;
			}

			const panelId = workspace.getSnapshot().focusedPanel ?? panels(layout.root)[0]?.id;

			if (panelId) {
				this.#place(workspace, channel, { into: panelId });
			} else {
				this.#open(workspace, channel, "side");
			}
		});
	}

	/**
	 * Splits the given panel in the given direction, opening a new empty split.
	 */
	public split(direction: SplitDirection, panelId = this.focusedPanelId) {
		this.#run((workspace) => {
			workspace.open("empty", {
				placement: panelId ? { beside: panelId, edge: DIRECTION_EDGE[direction] } : "side",
			});
		});
	}

	/**
	 * Splits the given panel in the given direction, placing the channel in the
	 * new split and moving it there if it's already open.
	 */
	public splitWith(channel: Channel, direction: SplitDirection, panelId = this.focusedPanelId) {
		if (!panelId) return;

		this.#run((workspace) => {
			this.#place(workspace, channel, { beside: panelId, edge: DIRECTION_EDGE[direction] });
		});
	}

	/**
	 * Closes the given view, collapsing its panel if it becomes empty.
	 */
	public close(viewId: string) {
		this.#run((workspace) => void workspace.close(viewId, { force: true }));
	}

	/**
	 * Closes every view in the given panel, removing it from the layout.
	 */
	public closePanel(panelId: string) {
		this.#run((workspace) => {
			const panel = panels(workspace.getDocument().root).find((p) => p.id === panelId);

			for (const viewId of panel?.views ?? []) {
				void workspace.close(viewId, { force: true });
			}
		});
	}

	/**
	 * Selects the next or previous tab in the focused panel.
	 */
	public cycle(offset: 1 | -1) {
		const workspace = this.workspace;
		if (!workspace) return;

		workspace.run(offset > 0 ? "tab.next" : "tab.previous");
		this.#focusInput(workspace);
	}

	/**
	 * Focuses the panel adjacent to the focused one in the given direction.
	 */
	public navigate(direction: SplitDirection) {
		const workspace = this.workspace;
		if (!workspace) return;

		const { document, focusedPanel } = workspace.getSnapshot();
		if (!focusedPanel) return;

		const rects: Rect[] = [];

		for (const [id, { node, rect }] of layoutRects(document.root)) {
			if (node.kind === "panel") {
				rects.push({ id, x: rect.x, y: rect.y, width: rect.w, height: rect.h });
			}
		}

		const panelId = neighbor(rects, focusedPanel, direction);
		if (panelId) this.#focus(workspace, panelId);
	}

	/**
	 * Begins tracking a channel drag.
	 */
	public startDrag(data: DragData) {
		this.drag = data;
	}

	/**
	 * Recomputes the highlighted drop target for the given pointer position.
	 */
	public updateDropTarget(point: Point) {
		this.dropTarget = this.drag && point ? this.#dropTargetAt(this.drag, point) : null;
	}

	/**
	 * Resolves and clears the current drag, dropping the channel at the given
	 * pointer position.
	 */
	public endDrag(point: Point) {
		const drag = this.drag;
		const target = drag && point ? this.#dropTargetAt(drag, point) : null;

		this.drag = null;
		this.dropTarget = null;

		const workspace = this.workspace;
		const channel = drag && app.channels.get(drag.id);

		if (!workspace || !target || !channel) return;

		if (!target.panelId) {
			this.#open(workspace, channel, "side");
		} else if (target.zone === "center") {
			this.#place(workspace, channel, { into: target.panelId });
		} else {
			this.#place(workspace, channel, { beside: target.panelId, edge: target.zone });
		}
	}

	/**
	 * Closes any ephemeral tabs that are still open in the layout.
	 */
	public cleanup() {
		const layout = this.layout;
		if (!layout) return;

		const workspace = this.workspace;

		if (!workspace) {
			storage.state.layout = withoutEphemeral($state.snapshot(layout));
			return;
		}

		for (const [id, record] of Object.entries(layout.views)) {
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion
			if ((record.params as ChannelViewParams | undefined)?.ephemeral) {
				void workspace.close(id, { force: true });
			}
		}
	}

	#run(fn: (workspace: WorkspaceHandle) => void) {
		if (this.workspace) {
			fn(this.workspace);
		} else {
			this.#pending.push(fn);
		}
	}

	/**
	 * Opens a channel that isn't in the layout yet.
	 */
	#open(workspace: WorkspaceHandle, channel: Channel, placement: Placement) {
		const params = channelParams(channel);

		workspace.open("channel", {
			id: channel.id,
			title: channel.user.displayName,
			placement,
			...(params && { params }),
		});

		this.#closePlaceholders(workspace, channel.id);
		this.#focusInput(workspace);
	}

	/**
	 * Opens a channel at the given target, moving it there if it's already open.
	 */
	#place(workspace: WorkspaceHandle, channel: Channel, target: DockTarget) {
		const layout = workspace.getDocument();

		if (!layout.views[channel.id]) {
			this.#open(workspace, channel, target);
			return;
		}

		const source = panels(layout.root).find((panel) => panel.views.includes(channel.id));

		const noop =
			"into" in target
				? target.into === source?.id
				: target.beside === source?.id && source.views.length === 1;

		if (!noop) {
			workspace.dock(channel.id, target);
			this.#closePlaceholders(workspace, channel.id);
		}

		this.#focus(workspace, channel.id);
	}

	/**
	 * Closes the empty split placeholders sharing a panel with the given view.
	 */
	#closePlaceholders(workspace: WorkspaceHandle, viewId: string) {
		const layout = workspace.getDocument();
		const panel = panels(layout.root).find((p) => p.views.includes(viewId));

		for (const id of panel?.views ?? []) {
			if (layout.views[id]?.type === "empty") {
				void workspace.close(id, { force: true });
			}
		}
	}

	/**
	 * Focuses a view, or the selected view of a panel, and its chat input.
	 */
	#focus(workspace: WorkspaceHandle, id: string) {
		workspace.focus(id);
		this.#focusInput(workspace);
	}

	#focusInput(workspace: WorkspaceHandle) {
		const viewId = workspace.getSnapshot().focusedView;
		if (!viewId) return;

		// Trellis moves focus to the first focusable element in the view on the
		// next frame, so take it back for the chat input afterwards
		requestAnimationFrame(() => {
			app.channels.get(viewId)?.chat.input?.focus();
		});
	}

	#syncFocus(workspace: WorkspaceHandle) {
		const { document, focusedView } = workspace.getSnapshot();
		if (focusedView === this.focusedViewId) return;

		this.focusedViewId = focusedView;

		app.focused =
			focusedView && isChannelView(document.views[focusedView])
				? (app.channels.get(focusedView) ?? null)
				: null;
	}

	async #closed(view: ViewInfo) {
		if (view.type !== "channel" || !settings.state["splits.leaveOnClose"]) return;

		await app.channels.get(view.id)?.leave();
	}

	#dropTargetAt(drag: DragData, point: NonNullable<Point>): DropTarget | null {
		const workspace = this.workspace;
		if (!workspace) return null;

		const bounds = workspace.element.getBoundingClientRect();
		if (!contains(bounds, point)) return null;

		const element = [
			...workspace.element.querySelectorAll<HTMLElement>("[data-trellis-part=panel]"),
		].find((el) => contains(el.getBoundingClientRect(), point));

		if (!element?.dataset.panel) {
			// Anywhere on an empty workspace opens the first split
			return workspace.getDocument().root
				? null
				: {
						panelId: null,
						zone: "center",
						rect: { x: 0, y: 0, width: bounds.width, height: bounds.height },
					};
		}

		const panelId = element.dataset.panel;
		const panel = panels(workspace.getDocument().root).find((p) => p.id === panelId);

		// Dropping a channel back onto its own panel when it's the only tab is a
		// no-op
		if (panel?.views.length === 1 && panel.views[0] === drag.id) return null;

		const rect = element.getBoundingClientRect();
		const tabbar = element.querySelector("[data-trellis-part=tabbar]");

		// Dropping on the tab bar adds a tab rather than splitting
		const zone =
			tabbar && contains(tabbar.getBoundingClientRect(), point)
				? "center"
				: zoneAt(rect, point);

		return {
			panelId,
			zone,
			rect: zoneRect(zone, {
				x: rect.left - bounds.left,
				y: rect.top - bounds.top,
				width: rect.width,
				height: rect.height,
			}),
		};
	}
}

function contains(rect: DOMRect, point: NonNullable<Point>) {
	return (
		point.x >= rect.left &&
		point.x <= rect.right &&
		point.y >= rect.top &&
		point.y <= rect.bottom
	);
}

/**
 * The drop zone for a panel, derived from the pointer position against the
 * panel's bounding rect.
 */
function zoneAt(rect: DOMRect, point: NonNullable<Point>): SplitDropZone {
	if (rect.width === 0 || rect.height === 0) return "center";

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
 * The area of a panel a drop into the given zone would occupy.
 */
// oxlint-disable-next-line typescript/consistent-return
function zoneRect(zone: SplitDropZone, rect: DropTarget["rect"]): DropTarget["rect"] {
	const halfWidth = rect.width / 2;
	const halfHeight = rect.height / 2;

	switch (zone) {
		case "left":
			return { ...rect, width: halfWidth };
		case "right":
			return { ...rect, x: rect.x + halfWidth, width: halfWidth };
		case "top":
			return { ...rect, height: halfHeight };
		case "bottom":
			return { ...rect, y: rect.y + halfHeight, height: halfHeight };
		case "center":
			return rect;
	}
}
