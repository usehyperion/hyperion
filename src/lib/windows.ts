import { LogicalPosition } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { Channel } from "./models/channel.svelte";
import type { User } from "./models/user.svelte";

import { log } from "./log";

/**
 * The prefix for user card popout window labels. Must be kept in sync with the
 * window glob in `src-tauri/capabilities/default.json`, otherwise popouts are
 * created without any permissions and every `invoke` silently fails.
 */
const USER_CARD_PREFIX = "user-card";

export function userCardLabel(userId: string) {
	return `${USER_CARD_PREFIX}:${userId}`;
}

/**
 * Opens a user card in its own window, or focuses the existing window when one
 * is already open for the user.
 *
 * Popouts live outside the `(main)` route group, so they run the shared boot in
 * the root layout load without opening a second set of chat connections.
 */
export async function openUserCard(user: User, channel: Channel) {
	const label = userCardLabel(user.id);

	const existing = await WebviewWindow.getByLabel(label);

	if (existing) {
		await existing.unminimize();
		await existing.setFocus();

		return existing;
	}

	const url = `/user/${user.id}?channel=${encodeURIComponent(channel.user.username)}`;

	const popout = new WebviewWindow(label, {
		url,
		title: user.displayName,
		width: 400,
		height: 600,
		minWidth: 360,
		minHeight: 400,
		resizable: true,
		hiddenTitle: true,
		titleBarStyle: "overlay",
		trafficLightPosition: new LogicalPosition(10, 20),
	});

	popout.once("tauri://error", (event) => {
		void log
			.error(`Failed to open user card for ${user.username}: ${String(event.payload)}`)
			.catch(() => {});
	});

	return popout;
}
