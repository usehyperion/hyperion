import { emit, emitTo, listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type { Message } from "./models/message/message";
import type { UserMessage } from "./models/message/user-message.svelte";
import type { Paint } from "./seventv";
import type { PrivmsgMessage, UserNoticeMessage } from "./twitch/irc";

import { app } from "./app.svelte";

/**
 * Cross-window protocol backing user card popouts.
 *
 * Popouts have no chat connection of their own, so the main window streams the
 * raw IRC payloads it already holds and the popout rebuilds real
 * {@linkcode UserMessage} instances from them. Only plain JSON crosses the
 * window boundary; nothing is serialized from, or restored into, a class.
 */
export const USER_CARD_SUBSCRIBE = "user-card:subscribe";
export const USER_CARD_UNSUBSCRIBE = "user-card:unsubscribe";
export const USER_CARD_SYNC = "user-card:sync";
export const USER_CARD_MESSAGE = "user-card:message";

export type RawUserMessage = PrivmsgMessage | UserNoticeMessage;

export interface UserCardSubscription {
	/**
	 * The label of the popout window the subscription belongs to.
	 */
	label: string;
	userId: string;
	channelId: string;
}

/**
 * The channel-scoped viewer flags for the user. These are driven by socket
 * events the popout never receives, so they are mirrored from the main window
 * to keep moderation actions correctly enabled.
 */
export interface ViewerState {
	broadcaster: boolean;
	moderator: boolean;
	subscriber: boolean;
	vip: boolean;
}

export interface UserCardSync {
	messages: RawUserMessage[];

	/**
	 * The user's 7TV paint. Paints only ever arrive over the 7TV socket, so a
	 * popout cannot resolve one on its own.
	 */
	paint: Paint | null;
	viewer: ViewerState | null;
}

const subscriptions = new Map<string, UserCardSubscription>();

/**
 * Serves popout subscriptions from the main window. Returns a cleanup function.
 */
export async function serveUserCards() {
	const unlisteners: UnlistenFn[] = [
		await listen<UserCardSubscription>(USER_CARD_SUBSCRIBE, async ({ payload }) => {
			subscriptions.set(payload.label, payload);

			await emitTo(payload.label, USER_CARD_SYNC, buildSync(payload));
		}),

		await listen<{ label: string }>(USER_CARD_UNSUBSCRIBE, ({ payload }) => {
			subscriptions.delete(payload.label);
		}),
	];

	return () => {
		for (const unlisten of unlisteners) unlisten();
		subscriptions.clear();
	};
}

function buildSync({ userId, channelId }: UserCardSubscription): UserCardSync {
	const channel = app.channels.get(channelId);
	const viewer = channel?.viewers.get(userId);

	const messages =
		channel?.chat.messages
			.filter((m): m is UserMessage => m.isUser() && m.author.id === userId)
			.map((m) => m.data) ?? [];

	return {
		messages,
		paint: app.u2p.get(userId) ?? null,
		viewer: viewer
			? {
					broadcaster: viewer.broadcaster,
					moderator: viewer.moderator,
					subscriber: viewer.subscriber,
					vip: viewer.vip,
				}
			: null,
	};
}

/**
 * Forwards a newly added message to any popout watching its author. A no-op in
 * windows with no subscribers, which includes every popout.
 */
export function publishUserCardMessage(message: Message) {
	if (!subscriptions.size || !message.isUser()) return;

	for (const subscription of subscriptions.values()) {
		if (
			subscription.userId !== message.author.id ||
			subscription.channelId !== message.channel.id
		) {
			continue;
		}

		void emitTo(subscription.label, USER_CARD_MESSAGE, message.data).catch(() => {});
	}
}

/**
 * Subscribes a popout window to its user's messages in the main window.
 */
export async function subscribeUserCard(
	subscription: UserCardSubscription,
	handlers: {
		onSync: (sync: UserCardSync) => void;
		onMessage: (data: RawUserMessage) => void;
	},
) {
	const unlisteners: UnlistenFn[] = [
		await listen<UserCardSync>(USER_CARD_SYNC, ({ payload }) => handlers.onSync(payload)),
		await listen<RawUserMessage>(USER_CARD_MESSAGE, ({ payload }) =>
			handlers.onMessage(payload),
		),
	];

	await emit(USER_CARD_SUBSCRIBE, subscription);

	return async () => {
		for (const unlisten of unlisteners) unlisten();

		await emit(USER_CARD_UNSUBSCRIBE, { label: subscription.label });
	};
}
