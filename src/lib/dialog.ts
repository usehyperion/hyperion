import { createDialogController, type DialogController } from "@ui-sdk/svelte/dialog";

export const dialogs = {
	about: "about-dialog",
	join: "join-dialog",
	settings: "settings-dialog",
	poll: (channelId: string) => `poll-dialog-${channelId}`,
	prediction: (channelId: string) => `prediction-dialog-${channelId}`,
	pinDuration: (messageId: string) => `pin-duration-dialog-${messageId}`,
} as const;

const controllers = new Map<string, DialogController>();

export function dialogController(id: string) {
	let controller = controllers.get(id);

	if (!controller) {
		controller = createDialogController();
		controllers.set(id, controller);
	}

	return controller;
}

export function openDialog(id: string) {
	return dialogController(id).open();
}

export function closeDialog(id: string) {
	return dialogController(id).close();
}
