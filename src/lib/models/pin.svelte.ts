import {
	pinnedMessageQuery,
	unpinMessageMutation,
	updatePinnedMessageMutation,
} from "#lib/graphql/twitch.js";

import type { Chat } from "./chat.svelte";
import type { User } from "./user.svelte";

import { fromGqlContent } from "./message/fragment";
import { UserMessage } from "./message/user-message.svelte";
import { Notice } from "./notice.svelte";

interface PinData {
	pinner: User;
	message: UserMessage;
	duration: number | null;
	expiresAt: number | null;
}

export class Pin extends Notice {
	#chat: Chat;

	public readonly pinner: User;

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

	private constructor(chat: Chat, data: PinData) {
		super();

		this.#chat = chat;
		this.pinner = data.pinner;
		this.message = data.message;
		this.duration = data.duration;
		this.expirationTimestamp = data.expiresAt;

		if (this.expirationTimestamp !== null) {
			this.expireIn(this.expirationTimestamp - Date.now());
		}
	}

	public static async fetch(chat: Chat): Promise<Pin | null> {
		const { channel } = await chat.channel.client.gql(pinnedMessageQuery, {
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
				id: node.pinnedMessage.id,
				text: node.pinnedMessage.content.text,
				fragments: fromGqlContent(node.pinnedMessage.content),
				sender,
				color: sender.chatColor ?? null,
				badges: sender.displayBadges
					.filter((badge) => badge !== null)
					.map((badge) => ({ name: badge.setID, version: badge.version })),
				timestamp: new Date(node.pinnedMessage.sentAt).getTime(),
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

	public async update(duration: number | null) {
		await this.#chat.channel.client.gql(updatePinnedMessageMutation, {
			message: this.message.id,
			duration,
		});

		await this.#chat.fetchPinned();
	}

	public async unpin() {
		await this.#chat.channel.client.gql(unpinMessageMutation, {
			message: this.message.id,
		});

		this.#chat.clearPin(this);
	}

	protected remove() {
		this.#chat.clearPin(this);
	}
}
