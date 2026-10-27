import { emit, emitTo, listen } from "@tauri-apps/api/event";
import type { UnlistenFn } from "@tauri-apps/api/event";

import type { Emote, EmoteProvider } from "./emotes";
import type { User as ApiUser, Cheermote } from "./graphql/twitch";
import type { BaseEmoteManager } from "./managers/base-emote-manager";
import type { Channel } from "./models/channel.svelte";
import type { Message } from "./models/message/message";
import type { UserMessage, UserMessageInit } from "./models/message/user-message.svelte";
import type { Relationship, RelationshipSubscription } from "./models/user.svelte";
import type { Paint } from "./seventv";

import { app } from "./app.svelte";
import { Badge } from "./models/badge";

/**
 * Cross-window protocol backing user card popouts.
 *
 * Popouts have no chat connection of their own, so the main window streams the
 * serialized messages it already holds and the popout rebuilds real
 * {@linkcode UserMessage} instances from them. Only plain JSON crosses the
 * window boundary; nothing is serialized from, or restored into, a class.
 */
export const USER_CARD_BOOTSTRAP = "user-card:bootstrap";
export const USER_CARD_BOOTSTRAP_REQUEST = "user-card:bootstrap-request";
export const USER_CARD_SUBSCRIBE = "user-card:subscribe";
export const USER_CARD_UNSUBSCRIBE = "user-card:unsubscribe";
export const USER_CARD_SYNC = "user-card:sync";
export const USER_CARD_MESSAGE = "user-card:message";

/**
 * How long a popout waits for the main window to answer a bootstrap request
 * before falling back to fetching everything itself.
 */
const BOOTSTRAP_TIMEOUT = 1000;

export interface UserCardSubscription {
	/**
	 * The label of the popout window the subscription belongs to.
	 */
	label: string;
	userId: string;
	channelId: string;
}

export type SerializedBadge = ConstructorParameters<typeof Badge>[0];

export interface SerializedRelationship {
	badges: SerializedBadge[];
	followedAt: string | null;
	subscription: RelationshipSubscription;
}

export interface SerializedEmotes {
	emotes: Emote[];

	/**
	 * The providers the emotes were loaded from.
	 */
	providers: EmoteProvider[];
}

/**
 * The app-wide emotes and badges, which messages fall back to when resolving
 * their own.
 */
export interface UserCardGlobals {
	/**
	 * Badge map entries. Keys aren't always the badge id, e.g. 7TV badges are
	 * keyed by their cosmetic id.
	 */
	badges: [string, SerializedBadge][];
	emotes: SerializedEmotes;

	/**
	 * The user's third-party badges. 7TV badges arrive over the 7TV socket, so a
	 * popout cannot resolve them on its own.
	 */
	userBadges: SerializedBadge[];
}

export interface UserCardChannelData {
	badges: SerializedBadge[];
	emotes: SerializedEmotes;
	cheermotes: Cheermote[];
	seventvId: string | null;
	emoteSetId: string | null;
}

/**
 * Everything the main window already knows that the popout needs to render
 * the card. Any field may be `null` if the main window has not loaded it, in
 * which case the popout fetches it itself.
 */
export interface UserCardBootstrap {
	user: ApiUser | null;
	broadcaster: ApiUser | null;
	relationship: SerializedRelationship | null;

	/**
	 * Whether the current user moderates the channel. Popouts skip loading the
	 * full list of moderated channels, so this is the only source for it.
	 */
	moderator: boolean;

	globals: UserCardGlobals | null;
	channel: UserCardChannelData | null;
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
	messages: UserMessageInit[];

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
		await listen<UserCardSubscription>(USER_CARD_BOOTSTRAP_REQUEST, async ({ payload }) => {
			await emitTo(payload.label, USER_CARD_BOOTSTRAP, buildBootstrap(payload));
		}),

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

function buildBootstrap({ userId, channelId }: UserCardSubscription): UserCardBootstrap {
	const channel = app.channels.get(channelId);

	// Relationships are stored on whichever instance the card was opened from,
	// which is usually the viewer's user rather than the one in the user cache.
	// The cached user is preferred for data since a partial user is replaced
	// there once it has been fetched.
	const viewerUser = channel?.viewers.get(userId)?.user;
	const cachedUser = app.twitch.users.get(userId);

	const relationship =
		viewerUser?.relationships.get(channelId) ?? cachedUser?.relationships.get(channelId);

	return {
		user: (cachedUser ?? viewerUser)?.data ?? null,
		broadcaster: channel?.user.data ?? null,
		relationship: relationship ? serializeRelationship(relationship) : null,
		moderator: app.user?.moderates(channelId) ?? false,
		globals: app.badges.size ? serializeGlobals(userId) : null,
		// Channels are only loaded once joined, so an unjoined channel has
		// nothing worth sending
		channel: channel?.joined ? serializeChannelData(channel) : null,
	};
}

function serializeGlobals(userId: string): UserCardGlobals {
	return {
		badges: app.badges
			.entries()
			.map(([key, badge]): [string, SerializedBadge] => [key, serializeBadge(badge)])
			.toArray(),
		emotes: serializeEmotes(app.emotes),
		userBadges: app.badges.users.get(userId)?.map(serializeBadge) ?? [],
	};
}

function serializeChannelData(channel: Channel): UserCardChannelData {
	return {
		badges: channel.badges.values().map(serializeBadge).toArray(),
		emotes: serializeEmotes(channel.emotes),
		cheermotes: [...channel.cheermotes.values()],
		seventvId: channel.seventvId,
		emoteSetId: channel.emoteSetId,
	};
}

function serializeEmotes(manager: BaseEmoteManager): SerializedEmotes {
	return { emotes: [...manager.values()], providers: manager.providers };
}

function serializeBadge(badge: Badge): SerializedBadge {
	return {
		setId: badge.setId,
		version: badge.version,
		title: badge.title,
		description: badge.description,
		color: badge.color,
		imageUrl: badge.imageUrl,
	};
}

function buildSync({ userId, channelId }: UserCardSubscription): UserCardSync {
	const channel = app.channels.get(channelId);
	const viewer = channel?.viewers.get(userId);

	const messages =
		channel?.chat.messages
			.filter((m): m is UserMessage => m.isUser() && m.author.id === userId)
			.map((m) => m.toJSON()) ?? [];

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

function serializeRelationship(relationship: Relationship): SerializedRelationship {
	return {
		badges: relationship.badges.map(serializeBadge),
		followedAt: relationship.followedAt?.toISOString() ?? null,
		subscription: relationship.subscription,
	};
}

export function deserializeRelationship(relationship: SerializedRelationship): Relationship {
	return {
		badges: relationship.badges.map((badge) => new Badge(badge)),
		followedAt: relationship.followedAt ? new Date(relationship.followedAt) : null,
		subscription: relationship.subscription,
	};
}

/**
 * Restores the app-wide emotes and badges sent by the main window.
 */
export function restoreGlobals(globals: UserCardGlobals, userId: string) {
	for (const [key, badge] of globals.badges) {
		app.badges.set(key, new Badge(badge));
	}

	app.badges.users.set(
		userId,
		globals.userBadges.map((badge) => new Badge(badge)),
	);
	app.emotes.restore(globals.emotes.emotes, globals.emotes.providers);
}

/**
 * Restores a channel's emotes, badges, and cheermotes sent by the main window.
 */
export function restoreChannelData(channel: Channel, data: UserCardChannelData) {
	for (const badge of data.badges.map((badge) => new Badge(badge))) {
		channel.badges.set(badge.id, badge);
	}

	for (const cheermote of data.cheermotes) {
		channel.cheermotes.set(cheermote.prefix.toLowerCase(), cheermote);
	}

	channel.emotes.restore(data.emotes.emotes, data.emotes.providers);
	channel.seventvId = data.seventvId;
	channel.emoteSetId = data.emoteSetId;
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

		void emitTo(subscription.label, USER_CARD_MESSAGE, message.toJSON()).catch(() => {});
	}
}

/**
 * Asks the main window for the data it already holds for a user card. Resolves
 * to `null` if the main window does not answer in time.
 */
export async function requestUserCardBootstrap(subscription: UserCardSubscription) {
	let unlisten: UnlistenFn | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;

	try {
		return await new Promise<UserCardBootstrap | null>((resolve, reject) => {
			timer = setTimeout(() => resolve(null), BOOTSTRAP_TIMEOUT);

			listen<UserCardBootstrap>(USER_CARD_BOOTSTRAP, ({ payload }) => resolve(payload), {
				target: subscription.label,
			})
				.then((fn) => {
					unlisten = fn;
					return emit(USER_CARD_BOOTSTRAP_REQUEST, subscription);
				})
				.catch(reject);
		});
	} finally {
		clearTimeout(timer);
		unlisten?.();
	}
}

/**
 * Subscribes a popout window to its user's messages in the main window.
 */
export async function subscribeUserCard(
	subscription: UserCardSubscription,
	handlers: {
		onSync: (sync: UserCardSync) => void;
		onMessage: (init: UserMessageInit) => void;
	},
) {
	// Listeners default to receiving events sent to any window, so they are
	// scoped to this popout to avoid picking up other popouts' messages.
	const options = { target: subscription.label };

	const unlisteners: UnlistenFn[] = [
		await listen<UserCardSync>(
			USER_CARD_SYNC,
			({ payload }) => handlers.onSync(payload),
			options,
		),
		await listen<UserMessageInit>(
			USER_CARD_MESSAGE,
			({ payload }) => handlers.onMessage(payload),
			options,
		),
	];

	await emit(USER_CARD_SUBSCRIBE, subscription);

	return async () => {
		for (const unlisten of unlisteners) unlisten();

		await emit(USER_CARD_UNSUBSCRIBE, { label: subscription.label });
	};
}
