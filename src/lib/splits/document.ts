import { sanitize, type LayoutNode, type PanelNode, type ViewRecord } from "@danfessler/trellis";

import { LAYOUT_VERSION, type ChannelViewParams, type Layout, type ViewType } from "./types";

interface LegacyTab {
	id: string;
	ephemeral?: boolean;
}

type LegacyNode =
	| { type: "pane"; id: string; size: number; tabs: LegacyTab[]; active: string | null }
	| {
			type: "split";
			id: string;
			size: number;
			axis: "horizontal" | "vertical";
			before: LegacyNode;
			after: LegacyNode;
	  };

interface LegacyLayout {
	version: 2;
	root: LegacyNode | null;
}

const VIEW_TYPES = new Set<string>(["channel", "empty"] satisfies ViewType[]);

export function isChannelView(record: ViewRecord | undefined): boolean {
	return record?.type === "channel";
}

export function panels(node: LayoutNode | null | undefined): PanelNode[] {
	if (!node) return [];
	if (node.kind === "panel") return [node];
	if (node.kind === "stage") return panels(node.child);

	return node.children.flatMap(panels);
}

export function channelParams({ ephemeral }: ChannelViewParams): ChannelViewParams | undefined {
	return ephemeral ? { ephemeral: true } : undefined;
}

/**
 * Brings a persisted layout up to the current version, converting the binary
 * split tree used by version 2. Anything unrecognized is discarded.
 */
export function migrate(input: unknown): Layout | null {
	if (!input || typeof input !== "object" || !("version" in input)) return null;

	if (input.version === LAYOUT_VERSION) {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion
		return sanitize(input as Layout, (type) => VIEW_TYPES.has(type));
	}

	if (input.version !== 2) return null;

	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	const legacy = input as LegacyLayout;
	const views: Record<string, ViewRecord> = {};

	const convert = (node: LegacyNode): LayoutNode => {
		if (node.type === "split") {
			return {
				kind: "split",
				id: node.id,
				axis: node.axis === "horizontal" ? "x" : "y",
				weights: [node.before.size, node.after.size],
				children: [convert(node.before), convert(node.after)],
			};
		}

		const ids = node.tabs.map((tab) => {
			const params = channelParams(tab);
			views[tab.id] = { type: "channel", ...(params && { params }) };

			return tab.id;
		});

		// Panels can't be empty, so an empty pane keeps its slot with a
		// placeholder view
		if (!ids.length) {
			const id = `empty-${crypto.randomUUID()}`;
			views[id] = { type: "empty" };
			ids.push(id);
		}

		return {
			kind: "panel",
			id: node.id,
			views: ids,
			selected: node.active && ids.includes(node.active) ? node.active : ids[0],
		};
	};

	return sanitize({
		schema: 1,
		version: LAYOUT_VERSION,
		root: legacy.root && convert(legacy.root),
		floating: [],
		hidden: [],
		views,
	});
}

/**
 * Removes every ephemeral channel view, collapsing any panels left empty.
 */
export function withoutEphemeral(layout: Layout): Layout {
	const views = Object.fromEntries(
		Object.entries(layout.views).filter(
			// oxlint-disable-next-line typescript/no-unsafe-type-assertion
			([, record]) => !(record.params as ChannelViewParams | undefined)?.ephemeral,
		),
	);

	return sanitize({ ...layout, views });
}
