export const dialogs = {
	about: "about-dialog",
	join: "join-dialog",
	settings: "settings-dialog",
	poll: (channelId: string) => `poll-dialog-${channelId}`,
	prediction: (channelId: string) => `prediction-dialog-${channelId}`,
	pinDuration: (messageId: string) => `pin-duration-dialog-${messageId}`,
} as const;

export function openDialog(id: string) {
	document.querySelector<HTMLDialogElement>(`#${CSS.escape(id)}`)?.showModal();
}

export function closeDialog(id: string) {
	document.querySelector<HTMLDialogElement>(`#${CSS.escape(id)}`)?.close();
}
