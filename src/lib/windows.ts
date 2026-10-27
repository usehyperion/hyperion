import { LogicalPosition } from "@tauri-apps/api/dpi";
import { emitTo, listen } from "@tauri-apps/api/event";
import { getAllWebviewWindows, WebviewWindow } from "@tauri-apps/api/webviewWindow";

import type { Channel } from "./models/channel.svelte";
import type { User } from "./models/user.svelte";

import { log } from "./log";
import { USER_CARD_ASSIGN, USER_CARD_IDLE, type UserCardAssignment } from "./user-cards";

/**
 * The prefix for user card popout window labels. Must be kept in sync with the
 * window glob in `src-tauri/capabilities/default.json`, otherwise popouts are
 * created without any permissions and every `invoke` silently fails.
 */
const USER_CARD_PREFIX = "user-card";

/**
 * The labels of open user card popouts keyed by the id of the user they show.
 */
const cards = new Map<string, string>();

/**
 * Spare popouts that have booted and are waiting for a user.
 */
const idle = new Set<string>();

/**
 * Assignments for claimed popouts that haven't finished booting yet, keyed by
 * label.
 */
const pending = new Map<string, UserCardAssignment>();

/**
 * The hidden popout the next user card is shown in. Creating a webview and
 * booting the app in it takes a few hundred milliseconds, so one is always
 * kept ready in the background.
 */
let spare: WebviewWindow | null = null;

/**
 * Starts keeping a spare user card popout ready. Returns a cleanup function.
 */
export async function prepareUserCards() {
	// Spares left behind by a previous instance of the main window, e.g. after
	// a reload, would otherwise linger hidden forever
	const windows = await getAllWebviewWindows();

	await Promise.all(
		windows.map(async (window) => {
			if (window.label.startsWith(USER_CARD_PREFIX) && !(await window.isVisible())) {
				await window.close();
			}
		}),
	);

	const unlisten = await listen<{ label: string }>(USER_CARD_IDLE, ({ payload }) => {
		const assignment = pending.get(payload.label);

		if (assignment) {
			pending.delete(payload.label);
			void emitTo(payload.label, USER_CARD_ASSIGN, assignment);
		} else {
			idle.add(payload.label);
		}
	});

	spare ??= createSpare();

	return () => {
		unlisten();

		void spare?.close();
		spare = null;
	};
}

/**
 * Opens a user card in its own window, or focuses the existing window when one
 * is already open for the user.
 *
 * Popouts live outside the `(main)` route group, so they run the shared boot in
 * the root layout load without opening a second set of chat connections.
 */
export async function openUserCard(user: User, channel: Channel) {
	const label = cards.get(user.id);
	const existing = label ? await WebviewWindow.getByLabel(label) : null;

	if (existing) {
		await existing.unminimize();
		await existing.setFocus();

		return existing;
	}

	const popout = spare ?? createSpare();
	spare = createSpare();

	cards.set(user.id, popout.label);

	void popout.once("tauri://destroyed", () => {
		if (cards.get(user.id) === popout.label) cards.delete(user.id);
	});

	const assignment: UserCardAssignment = {
		userId: user.id,
		channelId: channel.id,
		openedAt: Date.now(),
	};

	// A spare claimed before it has booted gets its user once it reports idle
	if (idle.delete(popout.label)) {
		await emitTo(popout.label, USER_CARD_ASSIGN, assignment);
	} else {
		pending.set(popout.label, assignment);
	}

	return popout;
}

function createSpare() {
	const label = `${USER_CARD_PREFIX}:${crypto.randomUUID()}`;

	// Spares are created hidden and show themselves once they render a card
	const popout = new WebviewWindow(label, {
		url: "/user",
		width: 400,
		height: 600,
		minWidth: 360,
		minHeight: 400,
		resizable: true,
		visible: false,
		hiddenTitle: true,
		titleBarStyle: "overlay",
		trafficLightPosition: new LogicalPosition(10, 20),
	});

	void popout.once("tauri://error", (event) => {
		void log
			.error(`Failed to create user card popout: ${String(event.payload)}`)
			.catch(() => {});
	});

	void popout.once("tauri://destroyed", () => {
		idle.delete(label);
		pending.delete(label);

		if (spare?.label === label) spare = null;
	});

	return popout;
}
