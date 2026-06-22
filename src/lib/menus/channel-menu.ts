import {
	CheckMenuItem,
	Menu,
	MenuItem,
	PredefinedMenuItem,
	type MenuOptions,
} from "@tauri-apps/api/menu";
import { app } from "$lib/app.svelte";
import type { Channel } from "$lib/models/channel.svelte";
import { settings } from "$lib/settings";
import { emptyPaneId, type SplitBranch, type SplitDirection } from "$lib/split-layout";
import { storage } from "$lib/stores";

async function splitItem(channel: Channel, direction: SplitDirection) {
	const enabled =
		app.splits.focused !== null &&
		app.splits.focused !== channel.id &&
		app.splits.root !== null &&
		!app.splits.contains(app.splits.root, channel.id);

	return MenuItem.new({
		id: `split-${direction}`,
		text: `Split ${direction.charAt(0).toUpperCase() + direction.slice(1)}`,
		enabled,
		async action() {
			await channel.join(true);

			if (!app.splits.focused) return;

			app.splits.root ??= app.splits.focused;

			const node: SplitBranch = {
				axis: direction === "up" || direction === "down" ? "vertical" : "horizontal",
				before: channel.id,
				after: app.splits.focused,
			};

			if (direction === "down" || direction === "right") {
				node.before = app.splits.focused;
				node.after = channel.id;
			}

			app.splits.insert(app.splits.focused, channel.id, node);
		},
	});
}

export async function createChannelMenu(channel: Channel) {
	const singleConnection = settings.state["advanced.singleConnection"];

	const separator = await PredefinedMenuItem.new({
		item: "Separator",
	});

	const join = await MenuItem.new({
		id: "join",
		text: "Join",
		enabled: !channel.joined,
		async action() {
			await app.open(channel);
		},
	});

	const leave = await MenuItem.new({
		id: "leave",
		text: "Leave",
		enabled: channel.joined,
		async action() {
			await channel.leave();

			if (app.splits.root && app.splits.contains(app.splits.root, channel.id)) {
				app.splits.replace(channel.id, emptyPaneId());
			} else if (app.focused === channel) {
				app.focused = null;
			}
		},
	});

	const pin = await CheckMenuItem.new({
		id: "pin",
		text: "Pin",
		accelerator: "CmdOrCtrl+P",
		enabled: !channel.ephemeral,
		checked: channel.pinned,
		async action() {
			if (channel.pinned) {
				storage.state.pinned = storage.state.pinned.filter((id) => id !== channel.id);
			} else {
				storage.state.pinned.push(channel.id);
			}
		},
	});

	const items: MenuOptions["items"] = [join, leave, pin];

	if (!singleConnection) {
		const splitItems = await Promise.all([
			splitItem(channel, "up"),
			splitItem(channel, "down"),
			splitItem(channel, "left"),
			splitItem(channel, "right"),
		]);

		items.push(separator, ...splitItems);
	}

	if (channel.ephemeral) {
		const remove = await MenuItem.new({
			id: "remove",
			text: "Remove",
			async action() {
				await channel.leave();

				if (app.splits.root && app.splits.contains(app.splits.root, channel.id)) {
					app.splits.remove(channel.id);
				}

				if (app.focused === channel) {
					app.focused = null;
				}

				app.channels.delete(channel.id);
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
