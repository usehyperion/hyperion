import type { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";

import { app } from "$lib/app.svelte";
import { storage } from "$lib/stores";

import type { DragData } from "./types";

function point(event: DragOverEvent | DragMoveEvent | DragEndEvent) {
	return event.operation.position?.current;
}

export function onDragStart(event: DragStartEvent) {
	const source = event.operation.source;

	if (source?.type === "channel") {
		// oxlint-disable-next-line typescript/no-unsafe-type-assertion
		app.splits.startDrag(source.data as DragData);
	}
}

export function onDragOver(event: DragOverEvent) {
	const { source, target } = event.operation;

	if (source?.type === "pinned") {
		if (target?.type === "pinned") {
			storage.state.pinned = move(storage.state.pinned, event);
		}

		return;
	}

	app.splits.updateDropTarget(point(event));
}

export function onDragMove(event: DragMoveEvent) {
	// The workspace isn't a droppable, so moving across it does not fire
	// `dragover`
	if (event.operation.source?.type === "pinned") return;

	app.splits.updateDropTarget(point(event));
}

export function onDragEnd(event: DragEndEvent) {
	app.splits.endDrag(event.operation.canceled ? undefined : point(event));
}
