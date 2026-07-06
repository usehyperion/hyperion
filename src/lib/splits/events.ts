import type { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
import { app } from "$lib/app.svelte";
import { storage } from "$lib/stores";
import type { DragData, DropData } from "./types";

function dropData(target: DragOverEvent["operation"]["target"]): DropData | null {
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion
	return target ? (target.data as DropData) : null;
}

function point(event: DragOverEvent | DragMoveEvent | DragEndEvent) {
	return event.operation.position?.current;
}

export function onDragStart(event: DragStartEvent) {
	const source = event.operation.source;

	if (source?.type === "tab" || source?.type === "channel") {
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

	app.splits.updateDropTarget(dropData(target), point(event));
}

export function onDragMove(event: DragMoveEvent) {
	// A pane is a single droppable, so moving between its edge zones does not
	// fire `dragover`
	if (event.operation.source?.type === "pinned") return;

	app.splits.updateDropTarget(dropData(event.operation.target), point(event));
}

export function onDragEnd(event: DragEndEvent) {
	if (event.operation.canceled) {
		app.splits.endDrag(null, undefined);
		return;
	}

	app.splits.endDrag(dropData(event.operation.target), point(event));
}
