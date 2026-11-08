import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";

import type { UserMessage } from "#lib/models/message/user-message.svelte.js";

import { messageActions, runAction, type MessageAction } from "./message-actions";

function item(message: UserMessage, action: MessageAction) {
	return MenuItem.new({
		text: action.label(),
		enabled: action.enabled(message),
		action: () => void runAction(message, action),
	});
}

export async function createMessageMenu(message: UserMessage) {
	const { copy, reply, pin, delete: remove, timeout, ban } = messageActions;

	const separator = await PredefinedMenuItem.new({ item: "Separator" });

	const items: (MenuItem | PredefinedMenuItem)[] = [
		await item(message, copy),
		separator,
		await item(message, reply),
	];

	if (message.channel.isMod) {
		items.push(
			await item(message, pin),
			separator,
			await item(message, remove),
			await item(message, timeout),
			await item(message, ban),
		);
	}

	const copyId = await MenuItem.new({
		text: "Copy Message ID",
		action: () => void navigator.clipboard.writeText(message.id),
	});

	items.push(separator, copyId);

	return Menu.new({ items });
}
