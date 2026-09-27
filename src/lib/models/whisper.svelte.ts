import { app } from "$lib/app.svelte";
import { nodes } from "$lib/graphql";
import type {
	WhisperMessage as ApiWhisperMessage,
	WhisperThread as ApiWhisperThread,
} from "$lib/graphql/twitch";
import {
	markWhisperReadMutation,
	sendWhisperMutation,
	whisperMessagesQuery,
} from "$lib/graphql/twitch";
import type { TwitchClient } from "$lib/twitch/client";

import type { Badge } from "./badge";
import type { User } from "./user.svelte";

export interface WhisperMessage {
	id: string;
	/**
	 * The client-generated nonce the message was sent with, if any. Used to
	 * match messages sent from this client against history.
	 */
	nonce?: string;
	createdAt: Date;
	badges: Badge[];
	user: User;
	text: string;
}

interface MessagePage {
	messages: WhisperMessage[];
	cursor: string | null;
	hasNext: boolean;
}

export class Whisper {
	// Live messages received before history finishes loading.
	#pending: WhisperMessage[] = [];

	#loaded = false;
	#history: Promise<void> | null = null;
	#older: Promise<void> | null = null;
	#cursor: string | null = null;

	// The newest message id known to exist on Twitch.
	#lastReadableId: string | null = null;

	/**
	 * The id of the whisper thread on Twitch.
	 */
	public readonly id: string;

	/**
	 * The loaded messages in the whisper, oldest first. Empty until
	 * {@linkcode load} is called.
	 */
	public messages = $state<WhisperMessage[]>([]);

	/**
	 * The most recent message reported by the thread list.
	 */
	public preview = $state<WhisperMessage | null>(null);

	/**
	 * The most recently sent message in the whisper.
	 */
	public readonly latest = $derived.by(() => {
		const last = this.messages.at(-1);

		if (!last || !this.preview) {
			return last ?? this.preview;
		}

		return last.createdAt >= this.preview.createdAt ? last : this.preview;
	});

	/**
	 * The number of unread messages in the whisper.
	 */
	public unread = $state(0);

	/**
	 * Whether there are older messages that can be loaded with
	 * {@linkcode loadOlder}.
	 */
	public hasOlder = $state(false);

	public constructor(
		public readonly client: TwitchClient,
		public readonly sender: User,
	) {
		this.id = [app.user?.id, sender.id].toSorted((a, b) => Number(a) - Number(b)).join("_");
	}

	/**
	 * Updates the whisper with the latest state from the thread list. Any
	 * loaded history is discarded since it may be missing messages sent from
	 * other clients; it will be reloaded the next time it's opened.
	 */
	public sync(thread: ApiWhisperThread) {
		this.unread = thread.unreadMessagesCount;
		this.preview = thread.lastMessage && this.#transform(thread.lastMessage);
		this.#lastReadableId = thread.lastMessage?.id ?? null;

		this.messages = [];
		this.#pending = [];
		this.#loaded = false;
		this.#history = null;
		this.#older = null;
		this.#cursor = null;
		this.hasOlder = false;
	}

	/**
	 * Adds a live message to the whisper.
	 */
	public add(message: WhisperMessage) {
		if (this.#loaded) {
			this.messages.push(message);
		} else {
			this.#pending.push(message);
			this.preview = message;
		}
	}

	/**
	 * Loads the most recent page of messages. Subsequent calls are no-ops until
	 * the next {@linkcode sync}.
	 */
	public load() {
		return (this.#history ??= this.#loadHistory());
	}

	/**
	 * Loads the page of messages before the oldest loaded message.
	 */
	public loadOlder() {
		if (!this.hasOlder) return Promise.resolve();

		const pending = this.#pending;

		this.#older ??= this.#fetchPage(this.#cursor)
			.then((page) => {
				if (this.#pending !== pending) return;

				this.#paginate(page);

				// Pages can overlap if messages arrive between requests.
				const known = new Set(this.messages.map((message) => message.id));

				this.messages.unshift(...page.messages.filter((message) => !known.has(message.id)));
			})
			.finally(() => {
				this.#older = null;
			});

		return this.#older;
	}

	public async markRead() {
		if (!this.unread) return;
		this.unread = 0;

		if (!this.#lastReadableId) return;

		await this.client.gql(markWhisperReadMutation, {
			thread: this.id,
			message: this.#lastReadableId,
		});
	}

	public async send(message: string) {
		if (!app.user || !message) return;

		const nonce = crypto.randomUUID();

		await this.client.gql(sendWhisperMutation, {
			input: {
				message,
				recipientUserID: this.sender.id,
				nonce,
			},
		});

		this.add({
			id: nonce,
			nonce,
			createdAt: new Date(),
			badges: [],
			user: app.user,
			text: message,
		});
	}

	async #loadHistory() {
		const pending = this.#pending;
		const requestedAt = new Date();

		try {
			const page = await this.#fetchPage(null);
			if (this.#pending !== pending) return;

			this.#paginate(page);

			const history = page.messages;
			const last = history.at(-1);

			if (last) {
				this.#lastReadableId = last.id;
			}

			// Anything received before the request was sent is already part of
			// the returned history, so only messages that arrived while it was
			// in flight need to be carried over.
			const inFlight = this.#pending.filter(
				(message) =>
					message.createdAt >= requestedAt &&
					!history.some((existing) => isSameMessage(existing, message)),
			);

			this.messages = [...history, ...inFlight];
			this.#pending = [];
			this.#loaded = true;
		} catch (error) {
			if (this.#pending === pending) {
				this.#history = null;
			}

			throw error;
		}
	}

	#paginate(page: MessagePage) {
		this.#cursor = page.cursor;
		this.hasOlder = page.hasNext && !!page.cursor;
	}

	async #fetchPage(after: string | null): Promise<MessagePage> {
		const { whisperThread } = await this.client.gql(whisperMessagesQuery, {
			id: this.id,
			after,
		});

		const connection = whisperThread?.messages;

		return {
			// Pages are returned newest first
			messages: nodes(connection)
				.toReversed()
				.map((message) => this.#transform(message)),
			cursor: connection?.edges.at(-1)?.cursor ?? null,
			hasNext: connection?.pageInfo.hasNextPage ?? false,
		};
	}

	#transform(message: ApiWhisperMessage): WhisperMessage {
		return {
			id: message.id,
			nonce: message.nonce || undefined,
			createdAt: new Date(message.sentAt),
			badges: [],
			user: message.from.id === this.sender.id ? this.sender : (app.user ?? this.sender),
			text: message.content.content ?? "",
		};
	}
}

function isSameMessage(a: WhisperMessage, b: WhisperMessage) {
	return (
		a.id === b.id ||
		(!!a.nonce && a.nonce === b.nonce) ||
		(a.user.id === b.user.id && a.text === b.text)
	);
}
