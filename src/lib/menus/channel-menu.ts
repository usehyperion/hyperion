import { CheckMenuItem, Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { goto } from "$app/navigation";
import { app } from "$lib/app.svelte";
import type { Channel } from "$lib/models/channel.svelte";
import { settings } from "$lib/settings";
import type { SplitBranch, SplitDirection } from "$lib/split-layout";

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

			if (!app.splits.active) {
				await goto("/channels/split");
			}
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
			await goto(`/channels/${channel.user.username}`);
		},
	});

	const leave = await MenuItem.new({
		id: "leave",
		text: "Leave",
		enabled: channel.joined,
		async action() {
			await channel.leave();

			if (!app.splits.active && app.focused === channel) {
				await goto("/");
			}
		},
	});

	const isEmpty = typeof app.splits.root === "string" && app.splits.root.startsWith("split-");

	const openInSplit = await MenuItem.new({
		id: "open-in-split",
		text: "Open in Split View",
		enabled: !singleConnection && (!app.splits.active || isEmpty),
		async action() {
			app.splits.root = channel.id;
			await goto("/channels/split");
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
				settings.state.pinned = settings.state.pinned.filter((id) => id !== channel.id);
			} else {
				settings.state.pinned.push(channel.id);
			}
		},
	});

	const remove = await MenuItem.new({
		id: "remove",
		text: "Remove",
		async action() {
			await channel.leave();
			app.channels.delete(channel.id);
			await goto("/");
		},
	});

	const items = [join, leave, pin, separator, openInSplit];

	if (app.splits.active && !singleConnection) {
		const splitItems = await Promise.all([
			splitItem(channel, "up"),
			splitItem(channel, "down"),
			splitItem(channel, "left"),
			splitItem(channel, "right"),
		]);

		items.push(separator, ...splitItems);
	}

	if (channel.ephemeral) {
		items.push(separator, remove);
	}

	return Menu.new({ items });
}
