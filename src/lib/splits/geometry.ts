import type { Rect, SplitDirection } from "./types";

/**
 * The nearest panel to `startId` in the given direction, by spatial adjacency,
 * preferring the neighbor with the most perpendicular overlap, then the closest.
 */
export function neighbor(rects: Rect[], startId: string, direction: SplitDirection): string | null {
	const current = rects.find((rect) => rect.id === startId);
	if (!current) return null;

	const eps = 0.001;
	const candidates = rects.filter(
		(rect) => rect.id !== startId && isAhead(current, rect, direction, eps),
	);
	if (!candidates.length) return null;

	const vertical = direction === "up" || direction === "down";

	const [best] = candidates.toSorted((a, b) => {
		const delta = overlap(current, b, vertical) - overlap(current, a, vertical);
		if (Math.abs(delta) > eps) return delta;

		return distance(current, a, direction) - distance(current, b, direction);
	});

	return best.id;
}

// oxlint-disable-next-line typescript/consistent-return
function isAhead(from: Rect, to: Rect, direction: SplitDirection, eps: number): boolean {
	switch (direction) {
		case "up":
			return to.y + to.height <= from.y + eps;
		case "down":
			return to.y >= from.y + from.height - eps;
		case "left":
			return to.x + to.width <= from.x + eps;
		case "right":
			return to.x >= from.x + from.width - eps;
	}
}

function overlap(from: Rect, to: Rect, vertical: boolean): number {
	const [start, end, tStart, tEnd] = vertical
		? [from.x, from.x + from.width, to.x, to.x + to.width]
		: [from.y, from.y + from.height, to.y, to.y + to.height];

	return Math.max(0, Math.min(end, tEnd) - Math.max(start, tStart));
}

// oxlint-disable-next-line typescript/consistent-return
function distance(from: Rect, to: Rect, direction: SplitDirection): number {
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
