import {
	CheckMenuItem,
	Menu,
	MenuItem,
	PredefinedMenuItem,
	type MenuOptions,
} from "@tauri-apps/api/menu";

import type { Channel } from "#lib/models/channel.svelte.js";
import type { SplitDirection } from "#lib/splits/types.js";

import { app } from "#lib/app.svelte.js";

async function splitItem(channel: Channel, direction: SplitDirection) {
	const enabled = app.splits.focused !== null && app.splits.paneOf(channel.id) === null;

	return MenuItem.new({
		id: `split-${direction}`,
		text: `Split ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
		enabled,
		async action() {
			await channel.join();

			const focused = app.splits.focused;
			if (!focused) return;

			app.splits.splitWithTab(focused.id, direction, channel);
		},
	});
}

export async function createChannelMenu(channel: Channel) {
	const separator = await PredefinedMenuItem.new({
		item: "Separator",
	});

	const join = await MenuItem.new({
		id: "join",
		text: "Join",
		enabled: channel.status === "idle",
		async action() {
			await app.open(channel);
		},
	});

	const leave = await MenuItem.new({
		id: "leave",
		text: "Leave",
		enabled: channel.status === "joining" || channel.status === "joined",
		async action() {
			await app.leave(channel);
		},
	});

	const pin = await CheckMenuItem.new({
		id: "pin",
		text: "Pin",
		accelerator: "CmdOrCtrl+P",
		enabled: !channel.ephemeral && channel.id !== app.user?.id,
		checked: channel.pinned,
		action() {
			channel.setPinned(!channel.pinned);
		},
	});

	const splitItems = await Promise.all([
		splitItem(channel, "up"),
		splitItem(channel, "down"),
		splitItem(channel, "left"),
		splitItem(channel, "right"),
	]);

	const items: MenuOptions["items"] = [join, leave, pin, separator, ...splitItems];

	if (channel.ephemeral) {
		const remove = await MenuItem.new({
			id: "remove",
			text: "Remove",
			async action() {
				await app.remove(channel);
			},
		});

		items.push(separator, remove);
	}

	const copyId = await MenuItem.new({
		id: "copy-id",
		text: "Copy Channel ID",
		action() {
			navigator.clipboard.writeText(channel.id);
		},
	});

	items.push(separator, copyId);

	return Menu.new({ items });
}
