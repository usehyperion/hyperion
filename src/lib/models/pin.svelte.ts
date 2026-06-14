import { app } from "$lib/app.svelte";
import { pinnedMessageQuery, toStructuredMessage } from "$lib/graphql/twitch";
import type { Chat } from "./chat.svelte";
import { UserMessage } from "./message/user-message";
import type { User } from "./user.svelte";

interface PinData {
	pinner: User;
	message: UserMessage;
	duration: number | null;
	expiresAt: number | null;
}

/**
 * Active poll intervals keyed by chat, so each chat polls at most once.
 */
const pollIds = new WeakMap<Chat, ReturnType<typeof setInterval>>();

/**
 * A single pinned message in a chat, along with the actions that can be
 * performed on it.
 */
export class Pin {
	static readonly #POLL_INTERVAL = 30 * 1000;

	#chat: Chat;
	#expiryId: ReturnType<typeof setTimeout> | null = null;

	/**
	 * The user who pinned the message.
	 */
	public readonly pinner: User;

	/**
	 * The message that was pinned.
	 */
	public readonly message: UserMessage;

	/**
	 * The duration in seconds for which the message is pinned for; `null` if
	 * the pin has no expiration.
	 */
	public readonly duration: number | null;

	/**
	 * The timestamp at which the pin expires; `null` if the pin has no
	 * expiration.
	 */
	public readonly expirationTimestamp: number | null;

	/**
	 * Whether the pinned message is hidden for the current user.
	 */
	public hidden = $state(false);

	private constructor(chat: Chat, data: PinData) {
		this.#chat = chat;
		this.pinner = data.pinner;
		this.message = data.message;
		this.duration = data.duration;
		this.expirationTimestamp = data.expiresAt;

		this.#scheduleExpiry();
	}

	public static async fetch(chat: Chat): Promise<Pin | null> {
		const { channel } = await chat.channel.client.send(pinnedMessageQuery, {
			id: chat.channel.id,
		});

		const node = channel?.pinnedChatMessages?.edges?.[0]?.node;
		const sender = node?.pinnedMessage.sender;

		if (!node || !sender) return null;

		const existing = chat.messages.find((m) => m.id === node.pinnedMessage.id);
		let message: UserMessage;

		if (existing?.isUser()) {
			message = existing;
		} else {
			message = UserMessage.from(chat.channel, {
				message: toStructuredMessage(node.pinnedMessage.id, node.pinnedMessage.content),
				sender,
				data: {
					name_color: sender.chatColor ?? "",
					badges: sender.displayBadges
						.filter((badge) => badge !== null)
						.map((badge) => ({ name: badge.setID, version: badge.version })),
					server_timestamp: new Date(node.pinnedMessage.sentAt).getTime(),
				},
			});
		}

		const pinner = await chat.channel.client.users.fetch(node.pinnedBy.id);

		const start = new Date(node.startsAt).getTime();
		const updated = node.updatedAt ? new Date(node.updatedAt).getTime() : null;
		const end = node.endsAt ? new Date(node.endsAt).getTime() : null;

		return new Pin(chat, {
			pinner,
			message,
			duration: end ? (end - (updated ?? start)) / 1000 : null,
			expiresAt: end,
		});
	}

	public static startPolling(chat: Chat) {
		Pin.stopPolling(chat);

		pollIds.set(
			chat,
			setInterval(() => void chat.fetchPinned(), this.#POLL_INTERVAL),
		);
	}

	public static stopPolling(chat: Chat) {
		const id = pollIds.get(chat);
		if (id === undefined) return;

		clearInterval(id);
		pollIds.delete(chat);
	}

	public async update(duration: number | null) {
		if (!app.user || !this.#chat.channel.isMod) return;

		await this.#chat.channel.client.patch("/chat/pins", {
			params: {
				broadcaster_id: this.#chat.channel.id,
				moderator_id: app.user.id,
				message_id: this.message.id,
				...(duration !== null && { duration_seconds: duration }),
			},
		});

		await this.#chat.fetchPinned();
	}

	/**
	 * Unpins this message.
	 */
	public async unpin() {
		if (!app.user || !this.#chat.channel.isMod) return;

		await this.#chat.channel.client.delete("/chat/pins", {
			broadcaster_id: this.#chat.channel.id,
			moderator_id: app.user.id,
			message_id: this.message.id,
		});

		this.#chat.clearPin(this);
	}

	public dispose() {
		if (this.#expiryId !== null) {
			clearTimeout(this.#expiryId);
			this.#expiryId = null;
		}
	}

	#scheduleExpiry() {
		if (this.expirationTimestamp === null) return;

		const remaining = Math.max(0, this.expirationTimestamp - Date.now());

		this.#expiryId = setTimeout(() => {
			this.#expiryId = null;
			this.#chat.clearPin(this);
		}, remaining);
	}
}
