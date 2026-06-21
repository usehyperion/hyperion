import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import type { UserMessage } from "$lib/models/message/user-message.svelte";

export async function createMessageMenu(message: UserMessage) {
	const items: (MenuItem | PredefinedMenuItem)[] = [];

	const separator = await PredefinedMenuItem.new({
		item: "Separator",
	});

	const copy = await MenuItem.new({
		id: "copy",
		text: "Copy",
		action() {
			navigator.clipboard.writeText(message.text);
		},
	});

	const reply = await MenuItem.new({
		id: "reply",
		text: "Reply",
		enabled: !message.deleted,
		action() {
			message.channel.chat.replyTarget = message;
			message.channel.chat.input?.focus();
		},
	});

	items.push(copy, separator, reply);

	if (message.channel.isMod) {
		const pin = await MenuItem.new({
			id: "pin",
			text: "Pin",
			enabled: !message.deleted && message.actionable && !message.pinned,
			async action() {
				await message.pin();
				await message.channel.chat.fetchPinned();
			},
		});

		items.push(pin);

		const deleteMsg = await MenuItem.new({
			id: "delete",
			text: "Delete",
			enabled: !message.deleted && message.actionable,
			action: () => message.delete(),
		});

		const timeout = await MenuItem.new({
			id: "timeout",
			text: "Timeout (10 minutes)",
			enabled: message.actionable,
			action: () => message.viewer?.timeout({ duration: 600 }),
		});

		const ban = await MenuItem.new({
			id: "ban",
			text: "Ban",
			enabled: message.actionable,
			action: () => message.viewer?.ban(),
		});

		items.push(separator, deleteMsg, timeout, ban);
	}

	const copyId = await MenuItem.new({
		id: "copy-id",
		text: "Copy Message ID",
		action() {
			navigator.clipboard.writeText(message.id);
		},
	});

	items.push(separator, copyId);

	return Menu.new({ items });
}
