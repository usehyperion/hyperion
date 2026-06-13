import { app } from "$lib/app.svelte";
import type { PinnedMessage } from "$lib/twitch/api";
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

	readonly #expiresAt: number | null;

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
	 * Whether the pinned message is hidden for the current user.
	 */
	public hidden = $state(false);

	private constructor(chat: Chat, data: PinData) {
		this.#chat = chat;
		this.pinner = data.pinner;
		this.message = data.message;
		this.duration = data.duration;
		this.#expiresAt = data.expiresAt;

		this.#scheduleExpiry();
	}

	public static async fetch(chat: Chat): Promise<Pin | null> {
		if (!app.user || !chat.channel.isMod) return null;

		const {
			data: [pinned],
		} = await chat.channel.client.get<[PinnedMessage?]>("/chat/pins", {
			broadcaster_id: chat.channel.id,
			moderator_id: app.user.id,
		});

		if (!pinned) return null;

		const existing = chat.messages.find((m) => m.id === pinned.message_id);
		let message: UserMessage;

		if (existing?.isUser()) {
			message = existing;
		} else {
			// The api doesn't include the message id on the actual message
			pinned.message.message_id = pinned.message_id;

			message = UserMessage.from(chat.channel, pinned.message, {
				id: pinned.sender_user_id,
				login: pinned.sender_user_login,
				name: pinned.sender_user_name,
			});
		}

		const pinner = await chat.channel.client.users.fetch(pinned.pinned_by_user_id);

		const start = new Date(pinned.starts_at).getTime();
		const end = pinned.expires_at ? new Date(pinned.expires_at).getTime() : null;

		return new Pin(chat, {
			pinner,
			message,
			duration: end ? (end - start) / 1000 : null,
			expiresAt: end,
		});
	}

	public static startPolling(chat: Chat) {
		Pin.stopPolling(chat);
		if (!app.user || !chat.channel.isMod) return;

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
		if (this.#expiresAt === null) return;

		const remaining = Math.max(0, this.#expiresAt - Date.now());

		this.#expiryId = setTimeout(() => {
			this.#expiryId = null;
			this.#chat.clearPin(this);
		}, remaining);
	}
}
